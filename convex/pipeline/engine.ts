import { v } from "convex/values";
import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Start the autonomous pipeline for a batch of prospects.
 * Called after CSV import — kicks off the first enrichment step for each prospect.
 */
export const startPipeline = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    prospectIds: v.array(v.id("prospects")),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("campaignEnrichmentConfigs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const enabledConfigs = configs
      .filter((c) => c.enabled)
      .sort((a, b) => a.columnOrder - b.columnOrder);

    if (enabledConfigs.length === 0) return;

    const firstStep = enabledConfigs[0].enrichmentType;

    // Create pending enrichment results for each prospect's first step
    for (const prospectId of args.prospectIds) {
      const existing = await ctx.db
        .query("enrichmentResults")
        .withIndex("by_prospect_type", (q) =>
          q.eq("prospectId", prospectId)
            .eq("campaignId", args.campaignId)
            .eq("enrichmentType", firstStep),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("enrichmentResults", {
          prospectId,
          campaignId: args.campaignId,
          orgId: args.orgId,
          enrichmentType: firstStep,
          status: "pending",
        });
      }
    }

    // Schedule the enrichment action for this batch
    await ctx.scheduler.runAfter(0, internal.pipeline.runner.runEnrichmentBatch, {
      campaignId: args.campaignId,
      orgId: args.orgId,
      enrichmentType: firstStep,
      prospectIds: args.prospectIds,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      orgId: args.orgId,
      campaignId: args.campaignId,
      type: "pipeline_started",
      message: `Pipeline started for ${args.prospectIds.length} prospects — first step: ${firstStep.replace(/_/g, " ")}`,
    });
  },
});

/**
 * Advance a prospect to the next enrichment step after one completes.
 * Called by the runner after each successful enrichment.
 */
export const advanceProspect = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    prospectId: v.id("prospects"),
    completedEnrichmentType: v.string(),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("campaignEnrichmentConfigs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const enabledConfigs = configs
      .filter((c) => c.enabled)
      .sort((a, b) => a.columnOrder - b.columnOrder);

    const currentIdx = enabledConfigs.findIndex(
      (c) => c.enrichmentType === args.completedEnrichmentType,
    );

    // If there's a next step, create pending result and schedule it
    if (currentIdx >= 0 && currentIdx < enabledConfigs.length - 1) {
      const nextStep = enabledConfigs[currentIdx + 1].enrichmentType;

      const existing = await ctx.db
        .query("enrichmentResults")
        .withIndex("by_prospect_type", (q) =>
          q.eq("prospectId", args.prospectId)
            .eq("campaignId", args.campaignId)
            .eq("enrichmentType", nextStep),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("enrichmentResults", {
          prospectId: args.prospectId,
          campaignId: args.campaignId,
          orgId: args.orgId,
          enrichmentType: nextStep,
          status: "pending",
        });
      }

      // Schedule the next enrichment
      await ctx.scheduler.runAfter(0, internal.pipeline.runner.runEnrichmentBatch, {
        campaignId: args.campaignId,
        orgId: args.orgId,
        enrichmentType: nextStep,
        prospectIds: [args.prospectId],
      });
    } else {
      // All enrichment steps done — trigger AI message generation
      await ctx.scheduler.runAfter(0, internal.pipeline.runner.generateMessage, {
        campaignId: args.campaignId,
        orgId: args.orgId,
        prospectId: args.prospectId,
      });
    }
  },
});

/**
 * Create default campaign settings when a campaign is created.
 */
export const createDefaultSettings = internalMutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("campaignSettings")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();

    if (!existing) {
      await ctx.db.insert("campaignSettings", {
        campaignId: args.campaignId,
        autoSendEnabled: false,
        confidenceThreshold: 80,
        dailySendLimit: 40,
        sendWindowStart: 9,
        sendWindowEnd: 17,
        sendTimezone: "Europe/London",
        paused: false,
        followUpEnabled: true,
        followUpDelayDays: 5,
        followUpMaxAttempts: 2,
      });
    }
  },
});
