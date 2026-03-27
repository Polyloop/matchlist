import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { prospectId, orgId } = await request.json();
    if (!prospectId || !orgId) {
      return NextResponse.json({ error: "Missing prospectId or orgId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get prospect details
    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", prospectId)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !prospect) {
      throw new Error(`Prospect not found: ${fetchError?.message}`);
    }

    // Get org details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    // Generate personalized outreach message via Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate a personalized, warm outreach email for a potential donor.

Context:
- Recipient: ${prospect.name}
- Their employer: ${prospect.employer || "Unknown"}
- Employer match ratio: ${prospect.employer_match_ratio ? `${prospect.employer_match_ratio}:1` : "Unknown"}
- Employer match cap: ${prospect.employer_match_cap ? `$${prospect.employer_match_cap}` : "Unknown"}
- Match eligible: ${prospect.match_eligible ? "Yes" : "No"}
- Nonprofit: ${org?.name || "Our organization"}

Write a concise, personal email that:
1. Acknowledges their potential connection to the cause
2. If match-eligible, highlights that their employer matches donations and what that means for impact
3. Includes a clear call to action
4. Keeps it under 200 words
5. Uses a warm but professional tone

Return only the email body, no subject line.`,
        },
      ],
    });

    const messageContent =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Create outreach message
    await supabase.from("outreach_messages").insert({
      org_id: orgId,
      prospect_id: prospectId,
      content: messageContent,
      status: "draft",
    });

    // Update enrichment job stage
    await supabase
      .from("enrichment_jobs")
      .update({
        stage: "message_generated",
        updated_at: new Date().toISOString(),
      })
      .eq("prospect_id", prospectId)
      .eq("org_id", orgId);

    return NextResponse.json({ success: true, stage: "message_generated" });
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
