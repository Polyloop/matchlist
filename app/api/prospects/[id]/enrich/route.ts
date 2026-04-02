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
    const { id: prospectId } = await params;

    const supabase = createAdminClient();

    // Verify prospect belongs to this org
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, import_batch_id")
      .eq("id", prospectId)
      .eq("org_id", orgId)
      .single();

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Reset enrichment job to pending
    await supabase
      .from("enrichment_jobs")
      .update({
        stage: "pending",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("prospect_id", prospectId)
      .eq("org_id", orgId);

    // Trigger enrichment pipeline
    await triggerPipelineStage("enrich", prospectId, orgId, {
      flow: prospect.import_batch_id ? "import_reveal" : "outreach_resume",
      stopAfter: prospect.import_batch_id ? "match" : "send",
      importBatchId: prospect.import_batch_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
