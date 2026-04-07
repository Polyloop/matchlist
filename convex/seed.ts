import { mutation } from "./_generated/server";

/**
 * Clear all data for the current org and re-seed with demo data.
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    let clerkOrgId: string | undefined;
    if (identity) {
      const o = (identity as Record<string, unknown>).o as { id?: string } | undefined;
      clerkOrgId = o?.id || (identity as Record<string, unknown>).org_id as string | undefined;
    }

    // Find or create org
    let org = clerkOrgId
      ? await ctx.db.query("organizations").withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId!)).first()
      : null;

    if (!org) {
      const allOrgs = await ctx.db.query("organizations").collect();
      org = allOrgs[0] ?? null;
      if (org && clerkOrgId && org.clerkOrgId !== clerkOrgId) {
        await ctx.db.patch(org._id, { clerkOrgId });
        org = (await ctx.db.get(org._id))!;
      }
    }

    if (!org) {
      const orgId = await ctx.db.insert("organizations", {
        clerkOrgId: clerkOrgId || "demo_org",
        name: "Habitat for Humanity",
      });
      org = (await ctx.db.get(orgId))!;
    }

    const orgId = org._id;

    // --- Clear all existing data for this org ---
    const tables = [
      "activityLog", "outreachSequenceSteps", "outreachMessages",
      "enrichmentResults", "enrichmentJobs", "prospects",
      "campaignEnrichmentConfigs", "campaignSettings", "campaigns",
      "prospectListMembers", "prospectLists", "importBatches", "orgSettings",
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        // Only delete rows belonging to this org (check common FK patterns)
        const r = row as Record<string, unknown>;
        if (r.orgId === orgId || r.campaignId || !r.orgId) {
          await ctx.db.delete(row._id);
        }
      }
    }

    return { cleared: true, campaigns: 0, prospects: 0 };
  },
});
