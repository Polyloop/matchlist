import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const campaignCsv = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== auth.orgId) return null;

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const enrichmentResults = await ctx.db
      .query("enrichmentResults")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const configs = await ctx.db
      .query("campaignEnrichmentConfigs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const enabledTypes = configs
      .filter((c) => c.enabled)
      .sort((a, b) => a.columnOrder - b.columnOrder)
      .map((c) => c.enrichmentType);

    // Build results lookup
    const resultsMap = new Map<string, Map<string, Record<string, unknown>>>();
    for (const r of enrichmentResults) {
      if (r.status !== "success" || !r.result) continue;
      if (!resultsMap.has(r.prospectId)) resultsMap.set(r.prospectId, new Map());
      resultsMap.get(r.prospectId)!.set(r.enrichmentType, r.result as Record<string, unknown>);
    }

    // Build CSV headers
    const headers = ["name", "email", "employer", "match_eligible"];
    for (const type of enabledTypes) {
      headers.push(type);
    }

    // Build rows
    const rows = prospects
      .filter((p) => p.orgId === auth.orgId)
      .map((p) => {
        const row: string[] = [
          p.name,
          p.email || "",
          p.employer || "",
          p.matchEligible ? "yes" : "no",
        ];
        for (const type of enabledTypes) {
          const result = resultsMap.get(p._id)?.get(type);
          row.push(result ? JSON.stringify(result) : "");
        }
        return row;
      });

    // Build CSV string
    const escape = (s: string) => {
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvLines = [
      headers.map(escape).join(","),
      ...rows.map((row) => row.map(escape).join(",")),
    ];

    return csvLines.join("\n");
  },
});
