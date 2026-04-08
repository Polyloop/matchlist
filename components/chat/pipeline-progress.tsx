"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function PipelineProgress({ campaignId }: { campaignId: string }) {
  const analytics = useQuery(api.analytics.queries.campaignAnalytics, {
    campaignId: campaignId as Id<"campaigns">,
  });

  if (!analytics) return null;

  const enrichmentTypes = Object.keys(analytics.enrichmentByType);
  const totalSteps = enrichmentTypes.length;
  const completed = Object.values(analytics.enrichmentByType).reduce(
    (sum, v) => sum + v.success, 0,
  );
  const total = analytics.totalProspects * Math.max(totalSteps, 1);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const messagesGenerated = analytics.outreach.draft + analytics.outreach.approved + analytics.outreach.sent;

  if (pct >= 100 && messagesGenerated > 0) {
    return (
      <div className="mt-2 text-[11px] text-emerald-600">
        Pipeline complete — {messagesGenerated} messages generated
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {completed}/{total} enrichment steps · {messagesGenerated} messages generated
      </p>
    </div>
  );
}
