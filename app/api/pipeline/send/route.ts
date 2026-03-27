import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { prospectId, orgId } = await request.json();
    if (!prospectId || !orgId) {
      return NextResponse.json({ error: "Missing prospectId or orgId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the outreach message
    const { data: message, error: msgError } = await supabase
      .from("outreach_messages")
      .select("*")
      .eq("prospect_id", prospectId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (msgError || !message) {
      throw new Error(`Outreach message not found: ${msgError?.message}`);
    }

    // Only send if approved — skip silently otherwise
    if (message.status !== "approved") {
      return NextResponse.json({
        success: true,
        stage: "message_generated",
        skipped: true,
        reason: "Message not yet approved",
      });
    }

    // Get prospect email
    const { data: prospect } = await supabase
      .from("prospects")
      .select("email, name")
      .eq("id", prospectId)
      .eq("org_id", orgId)
      .single();

    if (!prospect?.email) {
      throw new Error("Prospect has no email address");
    }

    // Send via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "outreach@matchlist.app",
      to: prospect.email,
      subject: `A special opportunity, ${prospect.name}`,
      text: message.content,
    });

    if (sendError) {
      throw new Error(`Failed to send email: ${sendError.message}`);
    }

    // Update message status
    await supabase
      .from("outreach_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", message.id);

    // Update enrichment job stage
    await supabase
      .from("enrichment_jobs")
      .update({
        stage: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("prospect_id", prospectId)
      .eq("org_id", orgId);

    return NextResponse.json({ success: true, stage: "sent" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      const { prospectId, orgId } = await request.clone().json();
      const supabase = createAdminClient();
      await supabase
        .from("enrichment_jobs")
        .update({
          stage: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("prospect_id", prospectId)
        .eq("org_id", orgId);
    } catch {
      // Best effort
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
