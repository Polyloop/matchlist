import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    // Get prospect counts
    const result = await Promise.all(
      campaigns.map(async (c) => {
        const prospects = await ctx.db
          .query("prospects")
          .withIndex("by_campaign", (q) => q.eq("campaignId", c._id))
          .collect();
        return { ...c, prospectCount: prospects.length };
      }),
    );

    return result.sort(
      (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0),
    );
  },
});

export const get = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    const campaign = await ctx.db.get(args.id);
    if (!campaign || campaign.orgId !== auth.orgId) return null;

    const configs = await ctx.db
      .query("campaignEnrichmentConfigs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.id))
      .collect();

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.id))
      .collect();

    return {
      ...campaign,
      enrichmentConfigs: configs.sort((a, b) => a.columnOrder - b.columnOrder),
      prospectCount: prospects.length,
    };
  },
});

export const getEnrichmentConfigs = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== auth.orgId) return [];

    const configs = await ctx.db
      .query("campaignEnrichmentConfigs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    return configs.sort((a, b) => a.columnOrder - b.columnOrder);
  },
});

export const getSettings = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== auth.orgId) return null;

    return await ctx.db
      .query("campaignSettings")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
  },
});

export const getEnrichmentResults = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== auth.orgId) return [];

    return await ctx.db
      .query("enrichmentResults")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});
