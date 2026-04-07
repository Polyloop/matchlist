import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const getReveal = query({
  args: { batchId: v.id("importBatches") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.orgId !== auth.orgId) return null;

    // Get all prospects in this batch
    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_import_batch", (q) => q.eq("importBatchId", args.batchId))
      .collect();

    // Get enrichment jobs for these prospects
    const jobs = await Promise.all(
      prospects.map(async (p) => {
        const job = await ctx.db
          .query("enrichmentJobs")
          .withIndex("by_org_prospect", (q) =>
            q.eq("orgId", auth.orgId).eq("prospectId", p._id),
          )
          .first();
        return { prospect: p, job };
      }),
    );

    const totalCount = prospects.length;
    const processedCount = jobs.filter(
      (j) => j.job && j.job.stage !== "pending",
    ).length;
    const failedCount = jobs.filter(
      (j) => j.job?.stage === "failed",
    ).length;
    const eligibleCount = prospects.filter((p) => p.matchEligible).length;

    // Calculate estimated match revenue
    const estimatedRevenue = prospects.reduce((sum, p) => {
      if (p.matchEligible && p.employerMatchRatio && p.employerMatchCap) {
        return sum + Math.min(p.employerMatchRatio * 100, p.employerMatchCap);
      }
      return sum;
    }, 0);

    // Employer breakdown
    const employerMap = new Map<string, { count: number; eligible: number }>();
    for (const p of prospects) {
      const employer = p.employer || "Unknown";
      const current = employerMap.get(employer) || { count: 0, eligible: 0 };
      current.count++;
      if (p.matchEligible) current.eligible++;
      employerMap.set(employer, current);
    }

    const employers = Array.from(employerMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      batch,
      totalCount,
      processedCount,
      failedCount,
      eligibleCount,
      estimatedRevenue,
      employers,
      isReady: totalCount === processedCount,
    };
  },
});
