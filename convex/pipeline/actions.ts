import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireOrg } from "../lib/auth";

/**
 * Re-run the full pipeline for all prospects in a campaign.
 * Exposed as a public mutation so it can be called from the UI.
 */
export const rerunPipeline = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== orgId) throw new Error("Not found");

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const prospectIds = prospects
      .filter((p) => p.orgId === orgId)
      .map((p) => p._id);

    if (prospectIds.length === 0) throw new Error("No prospects in campaign");

    // Clear existing enrichment results for this campaign
    const existingResults = await ctx.db
      .query("enrichmentResults")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const r of existingResults) {
      await ctx.db.delete(r._id);
    }

    // Clear existing outreach messages for this campaign
    const existingMessages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const m of existingMessages) {
      await ctx.db.delete(m._id);
    }

    // Clear existing sequence steps
    const existingSteps = await ctx.db
      .query("outreachSequenceSteps")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const s of existingSteps) {
      await ctx.db.delete(s._id);
    }

    // Start the pipeline fresh
    await ctx.scheduler.runAfter(0, internal.pipeline.engine.startPipeline, {
      campaignId: args.campaignId,
      orgId,
      prospectIds,
    });

    return { triggered: prospectIds.length };
  },
});
