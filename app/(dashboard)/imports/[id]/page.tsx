"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";

export default function ImportBatchRevealPage() {
  const params = useParams();
  const batchId = params.id as Id<"importBatches">;

  const reveal = useQuery(api.importBatches.queries.getReveal, { batchId });
  const loading = reveal === undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!reveal) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium">Import batch not found</p>
        <Button variant="outline" render={<Link href="/campaigns" />}>Back to Campaigns</Button>
      </div>
    );
  }

  const progressPct = reveal.totalCount > 0
    ? Math.round((reveal.processedCount / reveal.totalCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Match Revenue Reveal</h1>
        <p className="text-sm text-muted-foreground">
          {reveal.batch.sourceFilename || "Import batch"}
        </p>
      </div>

      {/* Hero metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="ring-1 ring-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Match Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              ${reveal.estimatedRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Match Eligible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reveal.eligibleCount}</div>
            <p className="text-xs text-muted-foreground">of {reveal.totalCount} prospects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progressPct}%</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {reveal.processedCount}/{reveal.totalCount} processed
              {reveal.failedCount > 0 && ` (${reveal.failedCount} failed)`}
            </p>
          </CardContent>
        </Card>
      </div>

      {reveal.isReady && (
        <Badge variant="default" className="text-sm">Processing complete</Badge>
      )}

      {/* Top employers */}
      {reveal.employers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reveal.employers.map((emp) => (
                <div key={emp.name} className="flex items-center justify-between text-sm">
                  <span>{emp.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{emp.count} prospects</Badge>
                    {emp.eligible > 0 && (
                      <Badge variant="default">{emp.eligible} eligible</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" render={<Link href={`/prospects?batch_id=${batchId}`} />}>
          View Prospects
        </Button>
      </div>
    </div>
  );
}
