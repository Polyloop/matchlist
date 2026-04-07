import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { requireOrg } from "../lib/auth";

export const createConnection = mutation({
  args: {
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    instanceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    // Remove existing connection for this provider
    const existing = await ctx.db
      .query("crmConnections")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    for (const conn of existing) {
      if (conn.provider === args.provider) {
        await ctx.db.delete(conn._id);
      }
    }

    return await ctx.db.insert("crmConnections", {
      orgId,
      provider: args.provider,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      instanceUrl: args.instanceUrl,
      syncEnabled: true,
    });
  },
});

export const disconnect = mutation({
  args: { connectionId: v.id("crmConnections") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const conn = await ctx.db.get(args.connectionId);
    if (!conn || conn.orgId !== orgId) throw new Error("Not found");
    await ctx.db.delete(args.connectionId);
  },
});

export const upsertProspectFromCrm = internalMutation({
  args: {
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    email: v.string(),
    employer: v.optional(v.string()),
    crmId: v.string(),
    crmProvider: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if prospect already exists by email
    const existing = await ctx.db
      .query("prospects")
      .withIndex("by_org_email", (q) => q.eq("orgId", args.orgId).eq("email", args.email))
      .first();

    if (existing) {
      // Update employer if we have new data
      if (args.employer && !existing.employer) {
        await ctx.db.patch(existing._id, { employer: args.employer });
      }
      return existing._id;
    }

    // Create new prospect
    return await ctx.db.insert("prospects", {
      orgId: args.orgId,
      campaignId: args.campaignId,
      name: args.name,
      email: args.email,
      employer: args.employer,
      matchEligible: false,
    });
  },
});

export const markSyncComplete = internalMutation({
  args: {
    connectionId: v.id("crmConnections"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, { lastSyncAt: Date.now() });
  },
});

export const markSyncFailed = internalMutation({
  args: {
    connectionId: v.id("crmConnections"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    // Log the error — don't disable sync automatically
    const conn = await ctx.db.get(args.connectionId);
    if (conn) {
      await ctx.db.insert("crmSyncLog", {
        orgId: conn.orgId,
        connectionId: args.connectionId,
        direction: "pull",
        entityType: "contact",
        entityId: "",
        status: "failed",
        details: args.error,
      });
    }
  },
});
