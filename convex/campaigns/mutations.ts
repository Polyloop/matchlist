import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireOrg } from "../lib/auth";

const campaignTypeValidator = v.union(
  v.literal("donation_matching"),
  v.literal("grant_research"),
  v.literal("corporate_sponsorship"),
  v.literal("volunteer_matching"),
  v.literal("in_kind_donation"),
);

// Default enrichment configs per campaign type
const DEFAULT_ENRICHMENTS: Record<string, Array<{ type: string; order: number }>> = {
  donation_matching: [
    { type: "linkedin_profile", order: 0 },
    { type: "employer_lookup", order: 1 },
    { type: "website_intelligence", order: 2 },
    { type: "match_programme", order: 3 },
    { type: "donor_score", order: 4 },
    { type: "ai_message", order: 5 },
  ],
  grant_research: [
    { type: "foundation_lookup", order: 0 },
    { type: "website_intelligence", order: 1 },
    { type: "grant_programmes", order: 2 },
    { type: "eligibility_check", order: 3 },
    { type: "donor_score", order: 4 },
    { type: "loi_generator", order: 5 },
  ],
  corporate_sponsorship: [
    { type: "company_research", order: 0 },
    { type: "website_intelligence", order: 1 },
    { type: "csr_signals", order: 2 },
    { type: "contact_enrichment", order: 3 },
    { type: "donor_score", order: 4 },
    { type: "proposal_generator", order: 5 },
  ],
  volunteer_matching: [
    { type: "company_research", order: 0 },
    { type: "website_intelligence", order: 1 },
    { type: "volunteer_programme", order: 2 },
    { type: "coordinator_lookup", order: 3 },
    { type: "donor_score", order: 4 },
    { type: "outreach_generator", order: 5 },
  ],
  in_kind_donation: [
    { type: "company_research", order: 0 },
    { type: "website_intelligence", order: 1 },
    { type: "donation_programme", order: 2 },
    { type: "procurement_contact", order: 3 },
    { type: "donor_score", order: 4 },
    { type: "request_generator", order: 5 },
  ],
};

export const create = mutation({
  args: {
    name: v.string(),
    type: campaignTypeValidator,
    description: v.optional(v.string()),
    templateSettings: v.optional(v.object({
      autoSendEnabled: v.optional(v.boolean()),
      confidenceThreshold: v.optional(v.number()),
      dailySendLimit: v.optional(v.number()),
      followUpEnabled: v.optional(v.boolean()),
      followUpDelayDays: v.optional(v.number()),
      followUpMaxAttempts: v.optional(v.number()),
    })),
    promptInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    const campaignId = await ctx.db.insert("campaigns", {
      orgId,
      name: args.name,
      type: args.type,
      status: "active",
      description: args.description,
    });

    // Create default enrichment configs
    const defaults = DEFAULT_ENRICHMENTS[args.type] || [];
    for (const d of defaults) {
      await ctx.db.insert("campaignEnrichmentConfigs", {
        campaignId,
        enrichmentType: d.type,
        columnOrder: d.order,
        enabled: true,
      });
    }

    // Create default autonomous settings
    await ctx.scheduler.runAfter(0, internal.pipeline.engine.createDefaultSettings, {
      campaignId,
    });

    // Apply template overrides + prompt instructions if provided
    if (args.templateSettings || args.promptInstructions) {
      // Schedule a follow-up to patch settings after defaults are created
      await ctx.scheduler.runAfter(500, internal.campaigns.internalMutations.applyTemplateSettings, {
        campaignId,
        settings: args.templateSettings || {},
        promptInstructions: args.promptInstructions,
      });
    }

    return campaignId;
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign || campaign.orgId !== orgId) throw new Error("Not found");

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);
  },
});

export const updateSettings = mutation({
  args: {
    campaignId: v.id("campaigns"),
    autoSendEnabled: v.optional(v.boolean()),
    confidenceThreshold: v.optional(v.number()),
    dailySendLimit: v.optional(v.number()),
    sendWindowStart: v.optional(v.number()),
    sendWindowEnd: v.optional(v.number()),
    sendTimezone: v.optional(v.string()),
    paused: v.optional(v.boolean()),
    followUpEnabled: v.optional(v.boolean()),
    followUpDelayDays: v.optional(v.number()),
    followUpMaxAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== orgId) throw new Error("Not found");

    const existing = await ctx.db
      .query("campaignSettings")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();

    if (!existing) throw new Error("Campaign settings not found");

    const { campaignId: _, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    await ctx.db.patch(existing._id, filtered);
  },
});

export const archive = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign || campaign.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.id, { status: "archived" });
  },
});
