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
    const { id: messageId } = await params;

    const supabase = createAdminClient();

    // Get message and verify org ownership
    const { data: message } = await supabase
      .from("outreach_messages")
      .select("id, prospect_id, status")
      .eq("id", messageId)
      .eq("org_id", orgId)
      .single();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.status !== "approved") {
      return NextResponse.json(
        { error: "Message must be approved before sending" },
        { status: 400 },
      );
    }

    // Trigger send pipeline stage
    await triggerPipelineStage("send", message.prospect_id, orgId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
