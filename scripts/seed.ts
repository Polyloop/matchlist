import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SEED_CLERK_ORG_ID = "org_3BWuiKSGtpnWgSNxyI2CG70VKTc";

async function seed() {
  console.log("Seeding database...");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .upsert(
      { clerk_org_id: SEED_CLERK_ORG_ID, name: "Demo Nonprofit" },
      { onConflict: "clerk_org_id" },
    )
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("Failed to create organization:", orgError);
    process.exit(1);
  }

  await supabase.from("prospects").delete().eq("org_id", org.id);
  await supabase.from("prospect_lists").delete().eq("org_id", org.id);
  await supabase.from("import_batches").delete().eq("org_id", org.id);

  const { data: importBatch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      org_id: org.id,
      source_filename: "spring-gala-match-reveal.csv",
    })
    .select("id")
    .single();

  if (batchError || !importBatch) {
    console.error("Failed to create import batch:", batchError);
    process.exit(1);
  }

  async function createList(
    name: string,
    type: "segment" | "team" | "campaign",
  ) {
    const { data, error } = await supabase
      .from("prospect_lists")
      .upsert(
        {
          org_id: org!.id,
          name,
          type,
        },
        { onConflict: "org_id,type,name" },
      )
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message || `Failed to create ${type} list: ${name}`);
    }

    return data.id;
  }

  const listIds = {
    teams: {
      "Major Gifts": await createList("Major Gifts", "team"),
      "Corporate Partnerships": await createList(
        "Corporate Partnerships",
        "team",
      ),
      Events: await createList("Events", "team"),
      Volunteers: await createList("Volunteers", "team"),
    },
    campaigns: {
      "Spring Gala": await createList("Spring Gala", "campaign"),
      "Emergency Relief": await createList("Emergency Relief", "campaign"),
      "End of Year": await createList("End of Year", "campaign"),
    },
    segments: {
      "Board Follow-Up": await createList("Board Follow-Up", "segment"),
      "Corporate Warm Leads": await createList(
        "Corporate Warm Leads",
        "segment",
      ),
    },
  };

  const prospects = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      linkedin_url: "https://linkedin.com/in/alicejohnson",
      employer: "Microsoft",
      employer_match_ratio: 1,
      employer_match_cap: 25000,
      match_eligible: true,
      team: "Major Gifts" as const,
      campaign: "Spring Gala" as const,
      stage: "sent" as const,
      segmentLists: ["Board Follow-Up"] as const,
      error_message: null,
      message: {
        content:
          "Hi Alice,\n\nMicrosoft employees can double the impact of their giving through a generous matching gift program. Your support for our Spring Gala campaign could unlock even more funding for families we serve.\n\nWould you be open to a quick conversation about how to activate your match?\n\nWarmly,\nThe Demo Nonprofit Team",
        status: "sent",
        sent_at: new Date().toISOString(),
      },
    },
    {
      name: "Ben Carter",
      email: "ben@example.com",
      linkedin_url: "https://linkedin.com/in/bencarter",
      employer: "Google",
      employer_match_ratio: 1,
      employer_match_cap: 20000,
      match_eligible: true,
      team: "Major Gifts" as const,
      campaign: "Spring Gala" as const,
      stage: "message_generated" as const,
      segmentLists: ["Board Follow-Up"] as const,
      error_message: null,
      message: {
        content:
          "Hi Ben,\n\nGoogle's matching gift program could turn one act of generosity into twice the impact for our Spring Gala campaign. We'd love to help you make the most of that opportunity.\n\nCould we send over the quick next steps?\n\nBest,\nThe Demo Nonprofit Team",
        status: "draft",
        sent_at: null,
      },
    },
    {
      name: "Chloe Singh",
      email: "chloe@example.com",
      linkedin_url: "https://linkedin.com/in/chloesingh",
      employer: "Salesforce",
      employer_match_ratio: 1,
      employer_match_cap: 15000,
      match_eligible: true,
      team: "Corporate Partnerships" as const,
      campaign: "Spring Gala" as const,
      stage: "matched" as const,
      segmentLists: ["Corporate Warm Leads"] as const,
      error_message: null,
      message: null,
    },
    {
      name: "Daniel Reed",
      email: "daniel@example.com",
      linkedin_url: "https://linkedin.com/in/danielreed",
      employer: "Atlassian",
      employer_match_ratio: 1,
      employer_match_cap: 15000,
      match_eligible: true,
      team: "Events" as const,
      campaign: "End of Year" as const,
      stage: "matched" as const,
      segmentLists: ["Corporate Warm Leads"] as const,
      error_message: null,
      message: null,
    },
    {
      name: "Emma Brooks",
      email: "emma@example.com",
      linkedin_url: "https://linkedin.com/in/emmabrooks",
      employer: "Stripe",
      employer_match_ratio: 1,
      employer_match_cap: 12000,
      match_eligible: true,
      team: "Corporate Partnerships" as const,
      campaign: "Emergency Relief" as const,
      stage: "matched" as const,
      segmentLists: ["Corporate Warm Leads"] as const,
      error_message: null,
      message: null,
    },
    {
      name: "Farah Khan",
      email: "farah@example.com",
      linkedin_url: "https://linkedin.com/in/farahkhan",
      employer: "Adobe",
      employer_match_ratio: 2,
      employer_match_cap: 40000,
      match_eligible: true,
      team: "Events" as const,
      campaign: "Emergency Relief" as const,
      stage: "matched" as const,
      segmentLists: ["Corporate Warm Leads"] as const,
      error_message: null,
      message: null,
    },
    {
      name: "Grace Lee",
      email: "grace@example.com",
      linkedin_url: "https://linkedin.com/in/gracelee",
      employer: "Microsoft",
      employer_match_ratio: 1,
      employer_match_cap: 30000,
      match_eligible: true,
      team: "Major Gifts" as const,
      campaign: "End of Year" as const,
      stage: "matched" as const,
      segmentLists: ["Board Follow-Up"] as const,
      error_message: null,
      message: null,
    },
    {
      name: "Henry Moss",
      email: "henry@example.com",
      linkedin_url: "https://linkedin.com/in/henrymoss",
      employer: "Google",
      employer_match_ratio: 1,
      employer_match_cap: 27000,
      match_eligible: true,
      team: "Volunteers" as const,
      campaign: "Spring Gala" as const,
      stage: "matched" as const,
      segmentLists: ["Board Follow-Up"] as const,
      error_message: null,
      message: null,
    },
    {
      name: "Ivy Chen",
      email: "ivy@example.com",
      linkedin_url: "https://linkedin.com/in/ivychen",
      employer: "Local Co-op",
      employer_match_ratio: null,
      employer_match_cap: null,
      match_eligible: false,
      team: "Volunteers" as const,
      campaign: "Emergency Relief" as const,
      stage: "failed" as const,
      segmentLists: [] as const,
      error_message: "Matching gift lookup failed for Local Co-op",
      message: null,
    },
    {
      name: "Jonah Price",
      email: "jonah@example.com",
      linkedin_url: "https://linkedin.com/in/jonahprice",
      employer: "Amazon",
      employer_match_ratio: null,
      employer_match_cap: null,
      match_eligible: false,
      team: "Events" as const,
      campaign: "Spring Gala" as const,
      stage: "failed" as const,
      segmentLists: [] as const,
      error_message: "Employer match data timed out during enrichment",
      message: null,
    },
  ];

  for (const prospect of prospects) {
    const { data: createdProspect, error: prospectError } = await supabase
      .from("prospects")
      .insert({
        org_id: org.id,
        import_batch_id: importBatch.id,
        name: prospect.name,
        email: prospect.email,
        linkedin_url: prospect.linkedin_url,
        employer: prospect.employer,
        employer_match_ratio: prospect.employer_match_ratio,
        employer_match_cap: prospect.employer_match_cap,
        match_eligible: prospect.match_eligible,
        team_list_id: listIds.teams[prospect.team],
        campaign_list_id: listIds.campaigns[prospect.campaign],
      })
      .select("id")
      .single();

    if (prospectError || !createdProspect) {
      console.error(`Failed to create prospect ${prospect.name}:`, prospectError);
      continue;
    }

    await supabase.from("enrichment_jobs").insert({
      org_id: org.id,
      prospect_id: createdProspect.id,
      stage: prospect.stage,
      error_message: prospect.error_message,
    });

    if (prospect.message) {
      await supabase.from("outreach_messages").insert({
        org_id: org.id,
        prospect_id: createdProspect.id,
        content: prospect.message.content,
        status: prospect.message.status,
        sent_at: prospect.message.sent_at,
      });
    }

    for (const segmentListName of prospect.segmentLists) {
      await supabase.from("prospect_list_members").upsert(
        {
          prospect_id: createdProspect.id,
          list_id: listIds.segments[segmentListName],
        },
        { onConflict: "prospect_id,list_id" },
      );
    }

    console.log(
      `  Created: ${prospect.name} (${prospect.team} / ${prospect.campaign} / ${prospect.stage})`,
    );
  }

  console.log("\nSeed complete!");
  console.log(`Import batch ready: ${importBatch.id}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
