import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatsCards } from "@/components/stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Rocket01Icon, TargetIcon } from "@hugeicons/core-free-icons";

export default async function DashboardPage() {
  const { orgId } = await requireOrg();
  const supabase = createAdminClient();

  const [
    { count: totalProspects },
    { count: enrichedCount },
    { count: matchEligibleCount },
    { count: sentCount },
    { data: matchValues },
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("enrichment_jobs")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("stage", ["enriched", "matched", "message_generated", "sent"]),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("match_eligible", true),
    supabase
      .from("outreach_messages")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "sent"),
    supabase
      .from("prospects")
      .select("employer_match_cap")
      .eq("org_id", orgId)
      .eq("match_eligible", true)
      .not("employer_match_cap", "is", null),
  ]);

  const estimatedMatchValue =
    matchValues?.reduce(
      (sum, p) => sum + (p.employer_match_cap || 0),
      0,
    ) ?? 0;

  const total = totalProspects ?? 0;
  const enriched = enrichedCount ?? 0;
  const matchEligible = matchEligibleCount ?? 0;
  const messagesSent = sentCount ?? 0;

  if (total === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon
              icon={Rocket01Icon}
              strokeWidth={1.5}
              className="size-8 text-primary"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to MatchList
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start by importing a list of donors. We&apos;ll identify which
            employers offer matching gift programs and help you reach out.
          </p>
          <Link
            href="/prospects/import"
            className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Import Your First List
          </Link>
        </div>
      </div>
    );
  }

  const pipelineSteps = [
    { label: "Imported", count: total, color: "bg-muted-foreground" },
    { label: "Enriched", count: enriched, color: "bg-primary/70" },
    { label: "Match Found", count: matchEligible, color: "bg-accent" },
    { label: "Outreach Sent", count: messagesSent, color: "bg-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero metric */}
      <section className="relative overflow-hidden rounded-lg border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/8 p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.52),transparent_42%)]" />
        <div className="relative space-y-4">
          <Badge variant="secondary" className="bg-background/80">
            Estimated Match Revenue
          </Badge>
          <div className="space-y-1">
            <p className="text-5xl font-semibold tracking-tight text-accent">
              ${estimatedMatchValue.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              across {matchEligible} match-eligible donor{matchEligible !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/prospects/import"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Import Prospects
            </Link>
            {messagesSent > 0 && (
              <Link
                href="/outreach"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted hover:text-foreground"
              >
                Review Outreach
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <StatsCards
        totalProspects={total}
        enriched={enriched}
        matchEligible={matchEligible}
        messagesSent={messagesSent}
      />

      {/* Pipeline funnel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={TargetIcon}
              strokeWidth={1.5}
              className="size-4 text-muted-foreground"
            />
            <CardTitle className="text-sm">Pipeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {pipelineSteps.map((step, i) => (
              <div key={step.label} className="flex flex-1 items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 shrink-0 rounded-full ${step.color}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {step.label}
                    </span>
                  </div>
                  <p className="mt-1 pl-4 text-lg font-semibold">
                    {step.count}
                  </p>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className="h-px w-6 bg-border" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
