import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerPipelineStage } from "@/lib/cronlet/pipeline";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: batchId } = await params;
    const supabase = createAdminClient();

    const { data: batch } = await supabase
      .from("import_batches")
      .select("id")
      .eq("id", batchId)
      .eq("org_id", orgId)
      .single();

    if (!batch) {
      return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
    }

    const { data: prospects, error } = await supabase
      .from("prospects")
      .select("id, enrichment_jobs!inner(stage)")
      .eq("org_id", orgId)
      .eq("import_batch_id", batchId)
      .eq("match_eligible", true)
      .eq("enrichment_jobs.stage", "matched");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const eligibleProspects = prospects ?? [];
    for (const prospect of eligibleProspects) {
      await triggerPipelineStage("generate-message", prospect.id, orgId, {
        flow: "outreach_resume",
        stopAfter: "send",
        importBatchId: batchId,
      });
    }

    return NextResponse.json({ started: eligibleProspects.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
