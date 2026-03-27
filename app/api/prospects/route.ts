import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const stage = searchParams.get("stage");
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    // Build query for prospects with their enrichment job status
    let query = supabase
      .from("prospects")
      .select(
        "*, enrichment_jobs!inner(stage, error_message)",
        { count: "exact" },
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (stage) {
      query = query.eq("enrichment_jobs.stage", stage);
    }

    const { data, error, count } = await query;

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
