import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const list = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
  },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    let messages;
    if (args.campaignId) {
      const cId = args.campaignId;
      messages = await ctx.db
        .query("outreachMessages")
        .withIndex("by_campaign", (q) => q.eq("campaignId", cId))
        .collect();
    } else {
      messages = await ctx.db
        .query("outreachMessages")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }

    const result = await Promise.all(
      messages
        .filter((m) => m.orgId === auth.orgId)
        .map(async (m) => {
          const prospect = await ctx.db.get(m.prospectId);
          const campaign = m.campaignId ? await ctx.db.get(m.campaignId) : null;
          return {
            ...m,
            prospectName: prospect?.name || "Unknown",
            prospectEmail: prospect?.email || null,
            campaignName: campaign?.name || null,
            campaignType: campaign?.type || null,
          };
        }),
    );

    return result.sort(
      (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0),
    );
  },
});
