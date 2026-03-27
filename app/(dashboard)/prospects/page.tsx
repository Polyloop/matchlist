import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProspectsTable } from "@/components/prospects-table";

export default async function ProspectsPage() {
  const { orgId } = await requireOrg();
  const supabase = createAdminClient();

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*, enrichment_jobs(stage, error_message)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prospects</h1>
        <Link
          href="/prospects/import"
          className="inline-flex h-8 items-center border border-transparent bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Import CSV
        </Link>
      </div>
      <ProspectsTable prospects={prospects ?? []} />
    </div>
  );
}
