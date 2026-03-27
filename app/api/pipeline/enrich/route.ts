import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Call Proxycurl API for LinkedIn enrichment
    let employer: string | null = null;
    if (prospect.linkedin_url) {
      const res = await fetch(
        `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(prospect.linkedin_url)}`,
        {
          headers: { Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        employer = data.experiences?.[0]?.company ?? null;
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
