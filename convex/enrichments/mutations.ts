import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrg } from "../lib/auth";

export const runColumn = mutation({
  args: {
    campaignId: v.id("campaigns"),
    enrichmentType: v.string(),
    prospectIds: v.optional(v.array(v.id("prospects"))),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== orgId) throw new Error("Not found");

    // Get target prospect IDs
    let targetIds = args.prospectIds;
    if (!targetIds || targetIds.length === 0) {
      const prospects = await ctx.db
        .query("prospects")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
        .collect();
      targetIds = prospects
        .filter((p) => p.orgId === orgId)
        .map((p) => p._id);
    }

    // Create/update enrichment results as pending
    for (const prospectId of targetIds) {
      const existing = await ctx.db
        .query("enrichmentResults")
        .withIndex("by_prospect_type", (q) =>
          q
            .eq("prospectId", prospectId)
            .eq("campaignId", args.campaignId)
            .eq("enrichmentType", args.enrichmentType),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "pending",
          result: undefined,
          errorMessage: undefined,
        });
      } else {
        await ctx.db.insert("enrichmentResults", {
          prospectId,
          campaignId: args.campaignId,
          orgId,
          enrichmentType: args.enrichmentType,
          status: "pending",
        });
      }
    }

    // TODO: Schedule pipeline actions via ctx.scheduler for each prospect

    return { queued: targetIds.length };
  },
});

export const retry = mutation({
  args: { resultId: v.id("enrichmentResults") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const result = await ctx.db.get(args.resultId);
    if (!result || result.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.resultId, {
      status: "pending",
      result: undefined,
      errorMessage: undefined,
    });

    // TODO: Schedule retry via ctx.scheduler
  },
});
