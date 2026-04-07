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

    const { data, error } = await supabase
      .from("campaign_enrichment_configs")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("column_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configs: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: campaignId } = await params;
    const { configs } = await request.json();
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

    // Upsert configs
    for (const config of configs) {
      await supabase
        .from("campaign_enrichment_configs")
        .upsert(
          {
            campaign_id: campaignId,
            enrichment_type: config.enrichment_type,
            column_order: config.column_order,
            enabled: config.enabled ?? true,
            config: config.config || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "campaign_id,enrichment_type" },
        );
    }

    // Re-fetch
    const { data } = await supabase
      .from("campaign_enrichment_configs")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("column_order", { ascending: true });

    return NextResponse.json({ configs: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
