import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatsCards } from "@/components/stats-cards";

export default async function DashboardPage() {
  const { orgId } = await requireOrg();
  const supabase = createAdminClient();

  // Fetch aggregate stats
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <StatsCards
        totalProspects={totalProspects ?? 0}
        enriched={enrichedCount ?? 0}
        matchEligible={matchEligibleCount ?? 0}
        messagesSent={sentCount ?? 0}
        estimatedMatchValue={estimatedMatchValue}
      />
    </div>
  );
}
