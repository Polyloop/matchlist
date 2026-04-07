import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*, campaign_enrichment_configs(*)")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get prospect count
    const { count } = await supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id);

    return NextResponse.json({
      campaign: { ...campaign, prospect_count: count || 0 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("campaigns")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id } = await params;
    const supabase = createAdminClient();

    // Archive instead of hard delete
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ archived: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
