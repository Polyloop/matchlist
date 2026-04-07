import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerPipelineStage } from "@/lib/cronlet/pipeline";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { campaignId, enrichmentType, prospectIds } = await request.json();

    if (!campaignId || !enrichmentType) {
      return NextResponse.json(
        { error: "campaignId and enrichmentType are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify campaign belongs to org
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("org_id", orgId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get prospect IDs for this campaign (or use provided subset)
    let targetIds: string[] = prospectIds;
    if (!targetIds || targetIds.length === 0) {
      const { data: prospects } = await supabase
        .from("prospects")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("org_id", orgId);
      targetIds = (prospects ?? []).map((p) => p.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No prospects to enrich" }, { status: 400 });
    }

    // Create pending enrichment_results for each prospect
    const rows = targetIds.map((prospectId) => ({
      prospect_id: prospectId,
      campaign_id: campaignId,
      org_id: orgId,
      enrichment_type: enrichmentType,
      status: "pending" as const,
    }));

    const { error: upsertError } = await supabase
      .from("enrichment_results")
      .upsert(rows, { onConflict: "prospect_id,campaign_id,enrichment_type" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Map enrichment types to pipeline stages for the existing pipeline
    const stageMap: Record<string, string> = {
      linkedin_profile: "enrich",
      employer_lookup: "enrich",
      match_programme: "match",
      ai_message: "generate-message",
    };

    const stopAfterMap: Record<string, "match" | "send"> = {
      enrich: "match",
      match: "match",
      "generate-message": "send",
      send: "send",
    };

    const pipelineStage = stageMap[enrichmentType];
    let triggered = 0;

    if (pipelineStage) {
      // Trigger existing pipeline for known types
      for (const prospectId of targetIds) {
        try {
          await triggerPipelineStage(
            pipelineStage as "enrich" | "match" | "generate-message" | "send",
            prospectId,
            orgId,
            { stopAfter: stopAfterMap[pipelineStage] || "send" },
          );
          triggered++;
        } catch {
          // Mark as failed
          await supabase
            .from("enrichment_results")
            .update({
              status: "failed",
              error_message: "Failed to trigger pipeline",
              updated_at: new Date().toISOString(),
            })
            .eq("prospect_id", prospectId)
            .eq("campaign_id", campaignId)
            .eq("enrichment_type", enrichmentType);
        }
      }
    } else {
      // For new enrichment types without pipeline handlers, mark as pending
      // (handlers will be added in Phase 4)
      triggered = targetIds.length;
    }

    return NextResponse.json({
      queued: targetIds.length,
      triggered,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
