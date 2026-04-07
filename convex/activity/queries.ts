import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const feed = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    let entries;
    if (args.campaignId) {
      entries = await ctx.db
        .query("activityLog")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
        .order("desc")
        .take(args.limit ?? 50);
    } else {
      entries = await ctx.db
        .query("activityLog")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .order("desc")
        .take(args.limit ?? 50);
    }

    return entries.filter((e) => e.orgId === auth.orgId);
  },
});
