"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignalsPanel } from "@/components/dashboard/signals";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  MailSend01Icon,
  ChartHistogramIcon,
  MailOpen01Icon,
} from "@hugeicons/core-free-icons";

export default function DashboardPage() {
  const metrics = useQuery(api.analytics.queries.global);
  const schedule = useQuery(api.analytics.queries.sendSchedule, {});

  // Group scheduled sends by day
  const upcoming = (schedule ?? []).filter((s: any) => s.status === "scheduled");
  const byDay = new Map<string, number>();
  for (const s of upcoming) {
    const day = new Date(s.scheduledAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }
  const upcomingDays = Array.from(byDay.entries()).slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      {/* Key numbers */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard icon={UserGroupIcon} value={metrics?.totalProspects ?? 0} label="Prospects" />
        <MetricCard icon={MailOpen01Icon} value={metrics?.messagesDraft ?? 0} label="To Review" href="/review" accent={(metrics?.messagesDraft ?? 0) > 0} />
        <MetricCard icon={MailSend01Icon} value={metrics?.messagesSent ?? 0} label="Sent" />
        <MetricCard icon={ChartHistogramIcon} value={`${metrics?.responseRate ?? 0}%`} label="Response" />
      </div>

      {/* Coming up */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Coming Up</h2>
        {upcomingDays.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nothing scheduled</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Approved messages will appear here with send times</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <div className="space-y-2">
                {upcomingDays.map(([day, count]) => (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-sm">{day}</span>
                    <Badge variant="secondary" className="text-xs tabular-nums">
                      {count} email{count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
              {upcoming.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-3">
                  {upcoming.length} total scheduled
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Needs attention */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Needs Attention</h2>
        <SignalsPanel />
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label, href, accent }: {
  icon: any; value: number | string; label: string; href?: string; accent?: boolean;
}) {
  const content = (
    <Card className={accent ? "border-amber-200" : ""}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${accent ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"}`}>
          <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4" />
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
