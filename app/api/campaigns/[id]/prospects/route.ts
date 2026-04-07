import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: campaignId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "200", 10);
    const offset = (page - 1) * limit;

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

    // Use left join so prospects without enrichment jobs are still returned
    const { data, error, count } = await supabase
      .from("prospects")
      .select("*, enrichment_jobs(stage, error_message)", { count: "exact" })
      .eq("org_id", orgId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      prospects: data,
      total: count,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
