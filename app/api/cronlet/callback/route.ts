import { NextResponse } from "next/server";
import type { TaskCallbackPayload } from "@cronlet/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerPipelineStage, getNextStage } from "@/lib/cronlet/pipeline";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TaskCallbackPayload;
    const event = request.headers.get("x-cronlet-event");

    if (!event || event !== payload.event) {
      return NextResponse.json({ error: "Bad event header" }, { status: 400 });
    }

    const metadata = payload.task.metadata as {
      prospectId: string;
      orgId: string;
      stage: string;
    } | null;

    if (!metadata?.prospectId || !metadata?.orgId || !metadata?.stage) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const { prospectId, orgId, stage } = metadata;
    const supabase = createAdminClient();

    // Idempotency: check if we've already processed this run
    if (payload.run) {
      const { data: existing } = await supabase
        .from("enrichment_jobs")
        .select("stage")
        .eq("prospect_id", prospectId)
        .eq("org_id", orgId)
        .single();

      // If the job has already failed, skip
      if (existing && existing.stage === "failed") {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    if (payload.event === "task.run.completed") {
      // Trigger next pipeline stage
      const nextStage = getNextStage(stage);
      if (nextStage) {
        await triggerPipelineStage(nextStage, prospectId, orgId);
      }
    }

    if (payload.event === "task.run.failed") {
      // Mark enrichment job as failed
      await supabase
        .from("enrichment_jobs")
        .update({
          stage: "failed",
          error_message: payload.run?.errorMessage || "Unknown error from Cronlet",
          updated_at: new Date().toISOString(),
        })
        .eq("prospect_id", prospectId)
        .eq("org_id", orgId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
