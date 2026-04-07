import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("outreach_messages")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .eq("status", "draft")
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ approved: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
