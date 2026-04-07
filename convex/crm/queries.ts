import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    return await ctx.db
      .query("crmConnections")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();
  },
});

export const getConnection = internalQuery({
  args: { connectionId: v.id("crmConnections") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.connectionId);
  },
});
