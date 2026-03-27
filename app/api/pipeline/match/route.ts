import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { prospectId, orgId } = await request.json();
    if (!prospectId || !orgId) {
      return NextResponse.json({ error: "Missing prospectId or orgId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get prospect employer
    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select("employer, name")
      .eq("id", prospectId)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !prospect) {
      throw new Error(`Prospect not found: ${fetchError?.message}`);
    }

    // Call Double the Donation API to check matching gift eligibility
    let matchRatio: number | null = null;
    let matchCap: number | null = null;
    let matchEligible = false;

    if (prospect.employer) {
      const res = await fetch(
        `https://doublethedonation.com/api/v2/companies/search?name=${encodeURIComponent(prospect.employer)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.DOUBLE_THE_DONATION_API_KEY}`,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const company = data.companies?.[0];
        if (company) {
          matchRatio = company.match_ratio ?? null;
          matchCap = company.match_cap ?? null;
          matchEligible = !!company.match_ratio;
        }
      }
    }

    // Update prospect with match data
    await supabase
      .from("prospects")
      .update({
        employer_match_ratio: matchRatio,
        employer_match_cap: matchCap,
        match_eligible: matchEligible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospectId)
      .eq("org_id", orgId);

    // Update enrichment job stage
    await supabase
      .from("enrichment_jobs")
      .update({
        stage: "matched",
        updated_at: new Date().toISOString(),
      })
      .eq("prospect_id", prospectId)
      .eq("org_id", orgId);

    return NextResponse.json({ success: true, stage: "matched" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

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
