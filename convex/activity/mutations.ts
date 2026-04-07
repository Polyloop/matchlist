import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const log = internalMutation({
  args: {
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    prospectId: v.optional(v.id("prospects")),
    type: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLog", {
      orgId: args.orgId,
      campaignId: args.campaignId,
      prospectId: args.prospectId,
      type: args.type,
      message: args.message,
      metadata: args.metadata,
    });
  },
});
