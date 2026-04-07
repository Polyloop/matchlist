import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: campaignId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("enrichment_results")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("org_id", orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
