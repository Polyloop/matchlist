"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import type { Id } from "@/convex/_generated/dataModel";
import { HugeiconsIcon } from "@hugeicons/react";
import { Rocket01Icon } from "@hugeicons/core-free-icons";

export default function CampaignActivityPage() {
  const params = useParams();
  const campaignId = params.id as Id<"campaigns">;

  const analytics = useQuery(api.analytics.queries.campaignAnalytics, { campaignId });

  // Count unique prospects that have at least one successful enrichment
  const enrichmentTypes = analytics ? Object.keys(analytics.enrichmentByType) : [];
  const totalSteps = enrichmentTypes.length;
  const completedSteps = analytics
    ? Object.values(analytics.enrichmentByType).reduce((sum, v) => sum + v.success, 0)
    : 0;
  const total = analytics?.totalProspects ?? 0;
  const totalExpected = total * Math.max(totalSteps, 1);
  const enrichedPct = totalExpected > 0 ? Math.round((completedSteps / totalExpected) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Agent status */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex size-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
            <HugeiconsIcon icon={Rocket01Icon} strokeWidth={1.5} className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {analytics?.outreach.sent ?? 0} sent
              {(analytics?.outreach.draft ?? 0) > 0 && ` / ${analytics?.outreach.draft} drafts to review`}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedSteps}/{totalExpected} enrichment steps &middot; {analytics?.outreach.responded ?? 0} responses
            </p>
          </div>
          {total > 0 && (
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums">
                {enrichedPct}%
              </p>
              <p className="text-[10px] text-muted-foreground">enriched</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity feed */}
      <Card>
        <CardContent className="max-h-[600px] overflow-y-auto p-3">
          <ActivityFeed campaignId={campaignId} limit={100} />
        </CardContent>
      </Card>
    </div>
  );
}
