"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ImportBatchReveal } from "@/lib/import-batches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatchRevenueRevealClientProps {
  batchId: string;
  initialReveal: ImportBatchReveal;
}

function AnimatedMetric({
  value,
  format = "number",
}: {
  value: number;
  format?: "number" | "currency";
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const start = previousValueRef.current;
    const end = value;
    if (start === end) return;

    const duration = 500;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = start + (end - start) * eased;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValueRef.current = end;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      previousValueRef.current = end;
    };
  }, [value]);

  const roundedValue = Math.round(displayValue);
  return format === "currency"
    ? `$${roundedValue.toLocaleString()}`
    : roundedValue.toLocaleString();
}

function BreakdownCard({
  title,
  description,
  items,
  emptyState,
}: {
  title: string;
  description: string;
  items: ImportBatchReveal["breakdowns"]["employer"];
  emptyState: string;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary">{items.length} groups</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {emptyState}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={`${title}-${item.name}`}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.prospectCount} prospects · {item.eligibleCount} eligible
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ${item.estimatedPotential.toLocaleString()}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    #{index + 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MatchRevenueRevealClient({
  batchId,
  initialReveal,
}: MatchRevenueRevealClientProps) {
  const router = useRouter();
  const [reveal, setReveal] = useState(initialReveal);
  const [isContinuing, setIsContinuing] = useState(false);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadReveal() {
      const res = await fetch(`/api/import-batches/${batchId}/reveal`, {
        cache: "no-store",
      });

      if (!res.ok) return;
      const nextReveal = (await res.json()) as ImportBatchReveal;
      setReveal(nextReveal);
    }

    loadReveal();

    pollingRef.current = window.setInterval(() => {
      loadReveal();
    }, 2500);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, [batchId]);

  const progressPercent = useMemo(() => {
    if (reveal.progress.totalProspectCount === 0) return 0;
    return Math.round(
      (reveal.progress.processedProspectCount / reveal.progress.totalProspectCount) *
        100,
    );
  }, [
    reveal.progress.processedProspectCount,
    reveal.progress.totalProspectCount,
  ]);

  async function handleContinueToOutreach() {
    setIsContinuing(true);
    try {
      const res = await fetch(`/api/import-batches/${batchId}/generate-outreach`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to continue to outreach");
        return;
      }

      toast.success(
        data.started > 0
          ? `Started outreach generation for ${data.started} prospects`
          : "No match-eligible prospects are ready for outreach yet",
      );
      router.push("/outreach");
    } catch {
      toast.error("Failed to continue to outreach");
    } finally {
      setIsContinuing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/8 p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.52),transparent_42%)]" />

        <div className="relative space-y-5">
          <Badge variant="secondary" className="bg-background/80">
            Match Revenue Reveal
          </Badge>

          <div className="space-y-3">
            <p className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              We found{" "}
              <span className="text-accent">
                <AnimatedMetric
                  value={reveal.headline.estimatedPotential}
                  format="currency"
                />
              </span>{" "}
              in estimated matchable donor potential across{" "}
              <span className="text-accent">
                <AnimatedMetric value={reveal.headline.eligibleProspectCount} />
              </span>{" "}
              people.
            </p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              This is an upper-bound estimate based on employer matching gift
              programs detected across this upload. As new match checks complete,
              the totals update live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleContinueToOutreach}
              disabled={
                isContinuing ||
                !reveal.progress.isReady ||
                reveal.headline.eligibleProspectCount === 0
              }
            >
              {isContinuing ? "Starting Outreach..." : "Continue to Outreach"}
            </Button>
            <Link
              href={`/prospects?batch_id=${batchId}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              View This Upload
            </Link>
            {!reveal.progress.isReady && (
              <span className="text-sm text-muted-foreground">
                Waiting for all prospects to finish match checking...
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Processing Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-3 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Processed
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {reveal.progress.processedProspectCount}/
                  {reveal.progress.totalProspectCount}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Ready for outreach
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {reveal.headline.eligibleProspectCount}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Failed checks
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {reveal.progress.failedProspectCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Upload Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Source file</span>
              <span className="max-w-[14rem] truncate font-medium">
                {reveal.batch.source_filename || "Untitled import"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={reveal.progress.isReady ? "default" : "secondary"}>
                {reveal.progress.isReady ? "Reveal ready" : "Updating live"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Estimated potential</span>
              <span className="font-medium">
                ${reveal.headline.estimatedPotential.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {reveal.failures.length > 0 && (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reveal.failures.map((failure) => (
              <div
                key={failure.prospectId}
                className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-sm font-medium">{failure.prospectName}</span>
                <span className="text-sm text-muted-foreground">
                  {failure.message}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <BreakdownCard
          title="Top Employers"
          description="The employers behind the largest discovered matching-gift opportunity."
          items={reveal.breakdowns.employer}
          emptyState="Employer breakdowns will appear after enrichment finishes."
        />
        <BreakdownCard
          title="Teams"
          description="Imported team groupings mapped from the CSV."
          items={reveal.breakdowns.team}
          emptyState="Add a team column during import to unlock this view."
        />
        <BreakdownCard
          title="Campaigns"
          description="Imported campaign groupings mapped from the CSV."
          items={reveal.breakdowns.campaign}
          emptyState="Add a campaign column during import to unlock this view."
        />
      </div>
    </div>
  );
}
