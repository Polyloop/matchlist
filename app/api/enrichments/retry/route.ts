import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { resultId } = await request.json();

    if (!resultId) {
      return NextResponse.json({ error: "resultId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify result belongs to org and reset it
    const { data, error } = await supabase
      .from("enrichment_results")
      .update({
        status: "pending",
        error_message: null,
        result: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resultId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
