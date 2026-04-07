import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const list = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    batchId: v.optional(v.id("importBatches")),
    listId: v.optional(v.id("prospectLists")),
  },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    let prospects;

    if (args.campaignId) {
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
        .collect();
    } else if (args.batchId) {
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_import_batch", (q) => q.eq("importBatchId", args.batchId))
        .collect();
    } else {
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }

    // Filter by org
    prospects = prospects.filter((p) => p.orgId === auth.orgId);

    // Filter by list membership if needed
    if (args.listId) {
      const listId = args.listId;
      const members = await ctx.db
        .query("prospectListMembers")
        .withIndex("by_list", (q) => q.eq("listId", listId))
        .collect();
      const memberIds = new Set(members.map((m) => m.prospectId));
      prospects = prospects.filter((p) => memberIds.has(p._id));
    }

    // Get enrichment jobs for each prospect
    const result = await Promise.all(
      prospects.map(async (p) => {
        const jobs = await ctx.db
          .query("enrichmentJobs")
          .withIndex("by_org_prospect", (q) =>
            q.eq("orgId", auth.orgId).eq("prospectId", p._id),
          )
          .collect();
        return {
          ...p,
          enrichment_jobs: jobs.map((j) => ({
            stage: j.stage,
            error_message: j.errorMessage ?? null,
          })),
        };
      }),
    );

    return result.sort(
      (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0),
    );
  },
});
