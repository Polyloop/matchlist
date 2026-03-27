import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SEED_CLERK_ORG_ID = "org_3BWuiKSGtpnWgSNxyI2CG70VKTc";

async function seed() {
  console.log("Seeding database...");

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .upsert(
      { clerk_org_id: SEED_CLERK_ORG_ID, name: "Demo Nonprofit" },
      { onConflict: "clerk_org_id" },
    )
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("Failed to create org:", orgError);
    process.exit(1);
  }

  console.log(`Organization created: ${org.id}`);

  // 2. Create 5 prospects at various pipeline stages
  const prospects = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      linkedin_url: "https://linkedin.com/in/alicejohnson",
      employer: "Microsoft",
      employer_match_ratio: 1,
      employer_match_cap: 15000,
      match_eligible: true,
      stage: "sent" as const,
      message: {
        content:
          "Hi Alice,\n\nAs someone at Microsoft, you have an incredible opportunity to double your impact. Microsoft matches donations dollar-for-dollar up to $15,000. Your generosity could go twice as far in supporting our mission.\n\nWould you be open to a quick conversation about how we can work together?\n\nWarm regards,\nThe Demo Nonprofit Team",
        status: "sent",
        sent_at: new Date().toISOString(),
      },
    },
    {
      name: "Bob Smith",
      email: "bob@example.com",
      linkedin_url: "https://linkedin.com/in/bobsmith",
      employer: "Google",
      employer_match_ratio: 1,
      employer_match_cap: 10000,
      match_eligible: true,
      stage: "message_generated" as const,
      message: {
        content:
          "Hi Bob,\n\nDid you know that Google matches employee donations? Your contribution could make twice the impact through their matching gift program, up to $10,000.\n\nWe'd love to share how your support can create meaningful change.\n\nBest,\nThe Demo Nonprofit Team",
        status: "draft",
        sent_at: null,
      },
    },
    {
      name: "Carol Davis",
      email: "carol@example.com",
      linkedin_url: "https://linkedin.com/in/caroldavis",
      employer: "Small Startup LLC",
      employer_match_ratio: null,
      employer_match_cap: null,
      match_eligible: false,
      stage: "matched" as const,
      message: null,
    },
    {
      name: "Dave Wilson",
      email: "dave@example.com",
      linkedin_url: "https://linkedin.com/in/davewilson",
      employer: "Amazon",
      employer_match_ratio: null,
      employer_match_cap: null,
      match_eligible: false,
      stage: "enriched" as const,
      message: null,
    },
    {
      name: "Eve Martinez",
      email: null,
      linkedin_url: "https://linkedin.com/in/evemartinez",
      employer: null,
      employer_match_ratio: null,
      employer_match_cap: null,
      match_eligible: false,
      stage: "pending" as const,
      message: null,
    },
  ];

  for (const p of prospects) {
    // Insert prospect
    const { data: prospect, error: pError } = await supabase
      .from("prospects")
      .insert({
        org_id: org.id,
        name: p.name,
        email: p.email,
        linkedin_url: p.linkedin_url,
        employer: p.employer,
        employer_match_ratio: p.employer_match_ratio,
        employer_match_cap: p.employer_match_cap,
        match_eligible: p.match_eligible,
      })
      .select("id")
      .single();

    if (pError || !prospect) {
      console.error(`Failed to create prospect ${p.name}:`, pError);
      continue;
    }

    // Create enrichment job
    await supabase.from("enrichment_jobs").insert({
      org_id: org.id,
      prospect_id: prospect.id,
      stage: p.stage,
    });

    // Create outreach message if applicable
    if (p.message) {
      await supabase.from("outreach_messages").insert({
        org_id: org.id,
        prospect_id: prospect.id,
        content: p.message.content,
        status: p.message.status,
        sent_at: p.message.sent_at,
      });
    }

    console.log(`  Created: ${p.name} (stage: ${p.stage})`);
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
