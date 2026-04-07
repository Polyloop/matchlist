"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { SendCalendar } from "@/components/dashboard/send-calendar";
import { CAMPAIGN_TYPE_CONFIGS } from "@/lib/campaigns/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Upload04Icon,
  GiftIcon,
  Search01Icon,
  Building06Icon,
  UserGroupIcon,
  PackageIcon,
  TargetIcon,
  MailSend01Icon,
  Rocket01Icon,
  ChartHistogramIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

const campaignIcons: Record<string, IconSvgElement> = {
  gift: GiftIcon,
  search: Search01Icon,
  building: Building06Icon,
  people: UserGroupIcon,
  package: PackageIcon,
};

export default function DashboardPage() {
  const campaigns = useQuery(api.campaigns.queries.list);
  const metrics = useQuery(api.analytics.queries.global);
  const seed = useMutation(api.seed.run);
  const loading = campaigns === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your campaign agent at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/campaigns" />}>
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.5} className="mr-1.5 size-3.5" />
            Import
          </Button>
          <Button size="sm" render={<Link href="/campaigns/new" />}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} className="mr-1.5 size-3.5" />
            New Campaign
          </Button>
          {/* TODO: Remove seed button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                const r = await seed();
                toast.success(`Seeded ${r.campaigns} campaigns, ${r.prospects} prospects`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Seed failed");
              }
            }}
          >
            Seed
          </Button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Active Campaigns"
          value={metrics?.activeCampaigns ?? 0}
          icon={TargetIcon}
        />
        <MetricCard
          label="Total Prospects"
          value={metrics?.totalProspects ?? 0}
          icon={UserGroupIcon}
        />
        <MetricCard
          label="Match Eligible"
          value={metrics?.matchEligible ?? 0}
          icon={Rocket01Icon}
          accent
        />
        <MetricCard
          label="Messages Sent"
          value={metrics?.messagesSent ?? 0}
          icon={MailSend01Icon}
        />
        <MetricCard
          label="Response Rate"
          value={`${metrics?.responseRate ?? 0}%`}
          icon={ChartHistogramIcon}
        />
      </div>

      {/* Main content: two columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Activity feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign cards */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Campaigns</h2>
              <Button variant="ghost" size="xs" render={<Link href="/campaigns" />}>
                View all
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="ml-1 size-3" />
              </Button>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-md border bg-muted/30" />
                ))}
              </div>
            ) : (campaigns ?? []).length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-between py-6">
                  <p className="text-sm text-muted-foreground">No campaigns yet</p>
                  <Button size="sm" render={<Link href="/campaigns/new" />}>Create Campaign</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(campaigns ?? []).slice(0, 4).map((campaign) => {
                  const config = CAMPAIGN_TYPE_CONFIGS[campaign.type];
                  const icon = campaignIcons[config?.icon || "gift"] || GiftIcon;
                  return (
                    <Link key={campaign._id} href={`/campaigns/${campaign._id}`}>
                      <div className="flex items-center gap-3 rounded-md border border-border/60 p-3 transition-colors hover:bg-muted/30">
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-md bg-muted ${config?.color || ""}`}>
                          <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{campaign.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {campaign.prospectCount} prospects
                          </p>
                        </div>
                        <Badge
                          variant={campaign.status === "active" ? "default" : "outline"}
                          className="shrink-0 text-[10px]"
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Activity feed */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Activity</h2>
            <Card>
              <CardContent className="max-h-[400px] overflow-y-auto p-3">
                <ActivityFeed limit={40} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Send schedule + stats */}
        <div className="space-y-6">
          {/* Pending review */}
          {(metrics?.messagesDraft ?? 0) > 0 && (
            <Card className="border-amber-500/20">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">{metrics?.messagesDraft} drafts</p>
                  <p className="text-[11px] text-muted-foreground">Need your review</p>
                </div>
                <Button size="sm" variant="outline" render={<Link href="/review" />}>
                  Review
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Send schedule */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Send Schedule</h2>
            <Card>
              <CardContent className="max-h-[350px] overflow-y-auto p-3">
                <SendCalendar />
              </CardContent>
            </Card>
          </div>

          {/* Quick stats */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Pipeline</h3>
              <div className="space-y-2">
                <StatRow label="Approved, pending send" value={metrics?.messagesApproved ?? 0} />
                <StatRow label="Responses received" value={metrics?.responsesReceived ?? 0} />
                <StatRow label="Total campaigns" value={metrics?.totalCampaigns ?? 0} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: IconSvgElement;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/20" : ""}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4" />
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
