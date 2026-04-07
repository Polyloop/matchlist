import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAMPAIGN_TYPE_CONFIGS } from "@/lib/campaigns/types";
import type { CampaignType } from "@/lib/supabase/types";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    const supabase = createAdminClient();

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get prospect counts per campaign
    const campaignIds = (campaigns ?? []).map((c) => c.id);
    const countsMap: Record<string, number> = {};

    if (campaignIds.length > 0) {
      const { data: counts } = await supabase
        .from("prospects")
        .select("campaign_id")
        .in("campaign_id", campaignIds);

      for (const row of counts ?? []) {
        if (row.campaign_id) {
          countsMap[row.campaign_id] = (countsMap[row.campaign_id] || 0) + 1;
        }
      }
    }

    const result = (campaigns ?? []).map((c) => ({
      ...c,
      prospect_count: countsMap[c.id] || 0,
    }));

    return NextResponse.json({ campaigns: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await request.json();
    const { name, type, description } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 },
      );
    }

    const config = CAMPAIGN_TYPE_CONFIGS[type as CampaignType];
    if (!config) {
      return NextResponse.json(
        { error: "Invalid campaign type" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        org_id: orgId,
        name,
        type,
        status: "active",
        description: description || null,
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: campaignError?.message || "Failed to create campaign" },
        { status: 500 },
      );
    }

    // Create default enrichment configs
    const enrichmentConfigs = config.defaultEnrichments.map((e) => ({
      campaign_id: campaign.id,
      enrichment_type: e.enrichment_type,
      column_order: e.column_order,
      enabled: e.enabled,
    }));

    if (enrichmentConfigs.length > 0) {
      const { error: configError } = await supabase
        .from("campaign_enrichment_configs")
        .insert(enrichmentConfigs);

      if (configError) {
        // Campaign was created but configs failed - log but don't fail
        console.error("Failed to create enrichment configs:", configError);
      }
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
