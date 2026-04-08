import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const applyTemplateSettings = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    settings: v.any(),
    promptInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("campaignSettings")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();

    if (!existing) return; // Settings not created yet, will retry

    const updates: Record<string, unknown> = {};
    const s = args.settings as Record<string, unknown> || {};

    if (s.autoSendEnabled !== undefined) updates.autoSendEnabled = s.autoSendEnabled;
    if (s.confidenceThreshold !== undefined) updates.confidenceThreshold = s.confidenceThreshold;
    if (s.dailySendLimit !== undefined) updates.dailySendLimit = s.dailySendLimit;
    if (s.followUpEnabled !== undefined) updates.followUpEnabled = s.followUpEnabled;
    if (s.followUpDelayDays !== undefined) updates.followUpDelayDays = s.followUpDelayDays;
    if (s.followUpMaxAttempts !== undefined) updates.followUpMaxAttempts = s.followUpMaxAttempts;
    if (args.promptInstructions) updates.promptInstructions = args.promptInstructions;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(existing._id, updates);
    }
  },
});
