"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const campaignId = params.id as Id<"campaigns">;
  const analytics = useQuery(api.analytics.queries.campaignAnalytics, { campaignId });

  if (!analytics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  // Enrichment success rates
  const enrichmentData = Object.entries(analytics.enrichmentByType).map(([type, counts]) => ({
    name: type.replace(/_/g, " "),
    success: counts.success,
    failed: counts.failed,
    pending: counts.pending + counts.running,
  }));

  // Outreach breakdown
  const outreachData = [
    { name: "Draft", value: analytics.outreach.draft, color: "var(--color-muted-foreground)" },
    { name: "Approved", value: analytics.outreach.approved, color: "var(--color-chart-2)" },
    { name: "Sent", value: analytics.outreach.sent, color: "var(--color-chart-1)" },
    { name: "Responded", value: analytics.outreach.responded, color: "var(--color-chart-3)" },
    { name: "Failed", value: analytics.outreach.failed, color: "var(--color-destructive)" },
  ].filter((d) => d.value > 0);

  const COLORS = [
    "hsl(var(--muted-foreground))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-3))",
    "hsl(var(--destructive))",
  ];

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total Prospects" value={analytics.totalProspects} />
        <StatCard label="Messages Sent" value={analytics.outreach.sent} />
        <StatCard label="Responses" value={analytics.outreach.responded} />
        <StatCard
          label="Response Rate"
          value={analytics.outreach.sent > 0
            ? `${Math.round((analytics.outreach.responded / analytics.outreach.sent) * 100)}%`
            : "—"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enrichment success rates */}
        {enrichmentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Enrichment Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={enrichmentData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="success" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="hsl(var(--chart-4))" />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Outreach breakdown */}
        {outreachData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Outreach Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={outreachData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {outreachData.map((_entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {outreachData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="size-2 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="ml-auto font-medium tabular-nums">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employer distribution */}
        {analytics.employers.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top Employers</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.employers} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
