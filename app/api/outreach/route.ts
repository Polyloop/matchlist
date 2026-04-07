import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    const supabase = createAdminClient();

    const { data: messages, error } = await supabase
      .from("outreach_messages")
      .select("*, prospects(name, email)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (messages ?? []).map((msg) => {
      const prospect = msg.prospects as { name: string; email: string } | null;
      return {
        id: msg.id,
        prospectName: prospect?.name || "Unknown",
        prospectEmail: prospect?.email || null,
        content: msg.content,
        status: msg.status,
        sent_at: msg.sent_at,
        created_at: msg.created_at,
      };
    });

    return NextResponse.json({ messages: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
