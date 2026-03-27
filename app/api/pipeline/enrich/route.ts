import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgSetting } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const { prospectId, orgId } = await request.json();
    if (!prospectId || !orgId) {
      return NextResponse.json({ error: "Missing prospectId or orgId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get prospect LinkedIn URL
    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select("linkedin_url, name")
      .eq("id", prospectId)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !prospect) {
      throw new Error(`Prospect not found: ${fetchError?.message}`);
    }

    // Call Bright Data LinkedIn Profile Scraper API
    let employer: string | null = null;
    if (prospect.linkedin_url) {
      const apiKey = await getOrgSetting(orgId, "BRIGHT_DATA_API_KEY");
      if (!apiKey) {
        throw new Error("Bright Data API key not configured");
      }

      const res = await fetch(
        "https://api.brightdata.com/linkedin/profiles/collect",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: prospect.linkedin_url }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        employer = data.current_company ?? null;
      } else {
        const errorText = await res.text();
        throw new Error(`Bright Data API error (${res.status}): ${errorText}`);
      }
    }

    // Update prospect with enriched data
    await supabase
      .from("prospects")
      .update({
        employer: employer ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospectId)
      .eq("org_id", orgId);

    // Update enrichment job stage
    await supabase
      .from("enrichment_jobs")
      .update({
        stage: "enriched",
        updated_at: new Date().toISOString(),
      })
      .eq("prospect_id", prospectId)
      .eq("org_id", orgId);

    return NextResponse.json({ success: true, stage: "enriched" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Mark job as failed
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
