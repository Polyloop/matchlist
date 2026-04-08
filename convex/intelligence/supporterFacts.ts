import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { getOrg } from "../lib/auth";

/**
 * Record a fact about a supporter. Called by pipeline, agent, and import flows.
 */
export const addFact = internalMutation({
  args: {
    orgId: v.id("organizations"),
    prospectId: v.id("prospects"),
    factType: v.string(),
    content: v.string(),
    source: v.string(),
    sourceDate: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("supporterFacts", {
      orgId: args.orgId,
      prospectId: args.prospectId,
      factType: args.factType,
      content: args.content,
      source: args.source,
      sourceDate: args.sourceDate,
      metadata: args.metadata,
    });
  },
});

/**
 * Get all facts for a supporter, newest first.
 */
export const getFactsForProspect = query({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    const facts = await ctx.db
      .query("supporterFacts")
      .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
      .collect();

    return facts
      .filter((f) => f.orgId === auth.orgId)
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
  },
});
