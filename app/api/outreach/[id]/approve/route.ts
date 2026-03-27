import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: messageId } = await params;

    const supabase = createAdminClient();

    // Verify message belongs to this org and is in draft status
    const { data: message } = await supabase
      .from("outreach_messages")
      .select("id, status")
      .eq("id", messageId)
      .eq("org_id", orgId)
      .single();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot approve message with status "${message.status}"` },
        { status: 400 },
      );
    }

    // Update status to approved
    const { data: updated, error } = await supabase
      .from("outreach_messages")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
