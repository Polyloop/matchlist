"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getMessagePrompt } from "./ai/templates";

/**
 * Run enrichment for a batch of prospects.
 * Currently a stub that simulates enrichment — real API integrations (Bright Data, etc.)
 * will be wired in when API keys are configured.
 */
export const runEnrichmentBatch = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    enrichmentType: v.string(),
    prospectIds: v.array(v.id("prospects")),
  },
  handler: async (ctx, args) => {
    for (const prospectId of args.prospectIds) {
      try {
        // Mark as running
        const existing = await ctx.runQuery(
          internal.pipeline.helpers.getEnrichmentResult,
          { prospectId, campaignId: args.campaignId, enrichmentType: args.enrichmentType },
        );

        if (existing) {
          await ctx.runMutation(internal.pipeline.helpers.updateEnrichmentResult, {
            id: existing,
            status: "running",
          });
        }

        // Get prospect data
        const prospect = await ctx.runQuery(
          internal.pipeline.helpers.getProspect,
          { prospectId },
        );

        if (!prospect) continue;

        // Execute enrichment based on type
        const result = await executeEnrichment(
          args.enrichmentType,
          prospect,
          ctx,
          args,
        );

        // Mark as success
        if (existing) {
          await ctx.runMutation(internal.pipeline.helpers.updateEnrichmentResult, {
            id: existing,
            status: "success",
            result,
          });
        }

        // Write back donor score to prospect if applicable
        if (args.enrichmentType === "donor_score" && result.score != null) {
          await ctx.runMutation(internal.pipeline.helpers.updateProspectScore, {
            prospectId,
            score: result.score as number,
          });
        }

        // Log activity
        await ctx.runMutation(internal.activity.mutations.log, {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId,
          type: "enrichment_complete",
          message: `${args.enrichmentType.replace(/_/g, " ")} completed for ${prospect.name}`,
          metadata: result,
        });

        // Advance to next step
        await ctx.runMutation(internal.pipeline.engine.advanceProspect, {
          campaignId: args.campaignId,
          orgId: args.orgId,
          prospectId,
          completedEnrichmentType: args.enrichmentType,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";

        // Find and mark as failed
        const existing = await ctx.runQuery(
          internal.pipeline.helpers.getEnrichmentResult,
          { prospectId, campaignId: args.campaignId, enrichmentType: args.enrichmentType },
        );

        if (existing) {
          await ctx.runMutation(internal.pipeline.helpers.updateEnrichmentResult, {
            id: existing,
            status: "failed",
            errorMessage: errorMsg,
          });
        }

        await ctx.runMutation(internal.activity.mutations.log, {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId,
          type: "enrichment_failed",
          message: `${args.enrichmentType.replace(/_/g, " ")} failed for prospect: ${errorMsg}`,
        });
      }
    }
  },
});

/**
 * Generate a personalised AI message for a prospect using all enrichment data.
 */
export const generateMessage = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    prospectId: v.id("prospects"),
  },
  handler: async (ctx, args) => {
    try {
      const prospect = await ctx.runQuery(
        internal.pipeline.helpers.getProspect,
        { prospectId: args.prospectId },
      );
      if (!prospect) return;

      const campaign = await ctx.runQuery(
        internal.pipeline.helpers.getCampaign,
        { campaignId: args.campaignId },
      );
      if (!campaign) return;

      const org = await ctx.runQuery(
        internal.pipeline.helpers.getOrg,
        { orgId: args.orgId },
      );

      // Gather all enrichment results for context
      const enrichmentResults = await ctx.runQuery(
        internal.pipeline.helpers.getProspectEnrichmentResults,
        { prospectId: args.prospectId, campaignId: args.campaignId },
      );

      const enrichmentContext: Record<string, unknown> = {};
      for (const r of enrichmentResults) {
        if (r.status === "success" && r.result) {
          enrichmentContext[r.enrichmentType] = r.result;
        }
      }

      // Get sender settings + API key
      const orgSettings = await ctx.runQuery(
        internal.pipeline.helpers.getOrgSettings,
        {
          orgId: args.orgId,
          keys: ["ANTHROPIC_API_KEY", "SENDER_NAME", "SENDER_TITLE", "SENDER_SIGNATURE", "ORG_NAME"],
        },
      );

      const senderName = orgSettings.SENDER_NAME || "The Team";
      const senderTitle = orgSettings.SENDER_TITLE || "";
      const senderSignature = orgSettings.SENDER_SIGNATURE || `${senderName}${senderTitle ? `\n${senderTitle}` : ""}\n${orgSettings.ORG_NAME || org?.name || ""}`;

      // Get campaign-specific prompt instructions
      const campaignSettings = await ctx.runQuery(
        internal.pipeline.helpers.getCampaignSettings,
        { campaignId: args.campaignId },
      );

      const prompt = getMessagePrompt({
        campaignType: campaign.type,
        orgName: orgSettings.ORG_NAME || org?.name || "Our Organisation",
        prospectName: prospect.name,
        prospectEmail: prospect.email || "",
        enrichmentData: enrichmentContext,
        sequenceStep: 0,
        senderName,
        senderTitle,
        senderSignature,
        outreachIntent: campaignSettings?.outreachIntent || undefined,
        membershipStatus: prospect.membershipStatus || undefined,
        lastEngagement: prospect.lastEngagement || undefined,
        engagementTypes: prospect.engagementTypes || undefined,
        donationHistory: prospect.donationHistory || undefined,
        notes: prospect.notes || undefined,
        role: prospect.role || undefined,
        memberSince: prospect.memberSince || undefined,
      });

      // Append campaign-specific instructions if they exist
      if (campaignSettings?.promptInstructions) {
        prompt.system += `\n\nADDITIONAL INSTRUCTIONS FROM CAMPAIGN OWNER:\n${campaignSettings.promptInstructions}`;
      }

      const apiKey = orgSettings.ANTHROPIC_API_KEY;

      if (!apiKey) {
        // No API key — create a placeholder draft
        await ctx.runMutation(internal.pipeline.helpers.createOutreachMessage, {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          subject: `Outreach to ${prospect.name}`,
          content: `[AI message generation requires an Anthropic API key. Configure it in Settings → Integrations.]`,
          status: "draft",
          confidenceScore: 0,
          sequenceStep: 0,
          personalisationContext: enrichmentContext,
        });

        await ctx.runMutation(internal.activity.mutations.log, {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "message_skipped",
          message: `Message generation skipped for ${prospect.name} — no API key configured`,
        });
        return;
      }

      // Generate with AI SDK
      const provider = createAnthropic({ apiKey });
      const { text } = await generateText({
        model: provider("claude-sonnet-4-20250514"),
        system: prompt.system,
        prompt: prompt.user,
        maxOutputTokens: 1000,
      });

      // Parse subject from generated text (first line)
      const lines = text.trim().split("\n");
      let subject = `Outreach to ${prospect.name}`;
      let body = text;

      if (lines[0]?.startsWith("Subject:")) {
        subject = lines[0].replace("Subject:", "").trim();
        body = lines.slice(1).join("\n").trim();
      }

      // Calculate confidence based on how much enrichment data was available
      const enrichmentCount = Object.keys(enrichmentContext).length;
      const confidenceScore = Math.min(95, 50 + enrichmentCount * 15);

      // Check campaign settings for auto-send
      const settings = await ctx.runQuery(
        internal.pipeline.helpers.getCampaignSettings,
        { campaignId: args.campaignId },
      );

      const shouldAutoSend =
        settings?.autoSendEnabled &&
        !settings.paused &&
        confidenceScore >= (settings.confidenceThreshold || 80);

      const messageId = await ctx.runMutation(internal.pipeline.helpers.createOutreachMessage, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        subject,
        content: body,
        status: shouldAutoSend ? "approved" : "draft",
        confidenceScore,
        sequenceStep: 0,
        personalisationContext: enrichmentContext,
      });

      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "message_generated",
        message: `AI message generated for ${prospect.name} (confidence: ${confidenceScore}%)${shouldAutoSend ? " — auto-approved" : " — queued for review"}`,
        metadata: { confidenceScore, autoSend: shouldAutoSend },
      });

      // If auto-approved, schedule the send via Cronlet
      if (shouldAutoSend) {
        try {
          await ctx.runAction(internal.pipeline.scheduler.scheduleSend, {
            messageId,
            campaignId: args.campaignId,
            orgId: args.orgId,
            prospectId: args.prospectId,
            prospectName: prospect.name,
          });
        } catch (schedError) {
          // Cronlet scheduling failed — message stays approved, can be sent manually
          await ctx.runMutation(internal.activity.mutations.log, {
            orgId: args.orgId,
            campaignId: args.campaignId,
            prospectId: args.prospectId,
            type: "schedule_failed",
            message: `Failed to schedule send for ${prospect.name}: ${schedError instanceof Error ? schedError.message : "Unknown error"}`,
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "message_failed",
        message: `AI message generation failed for prospect: ${errorMsg}`,
      });
    }
  },
});

// --- Enrichment execution logic ---

async function executeEnrichment(
  enrichmentType: string,
  prospect: { _id?: string; name: string; email?: string; employer?: string; linkedinUrl?: string },
  ctx: { runQuery: Function },
  args: { orgId: string; campaignId: string; prospectIds?: string[] },
): Promise<Record<string, unknown>> {
  // Fetch org API keys for enrichments that need them
  const getKey = async (key: string): Promise<string | null> => {
    return await ctx.runQuery(internal.pipeline.helpers.getOrgSetting, {
      orgId: args.orgId,
      key,
    });
  };

  switch (enrichmentType) {
    case "linkedin_profile": {
      // Uses data from CSV import. LinkedIn profile scraping will be available
      // via HeyReach integration (planned) or manual enrichment.
      return {
        profile_url: prospect.linkedinUrl || null,
        employer: prospect.employer || null,
      };
    }

    case "employer_lookup":
      return { employer: prospect.employer || null };

    case "match_programme": {
      if (!prospect.employer) {
        return { match_eligible: false, match_ratio: 0, match_cap: 0, note: "No employer to look up" };
      }

      // Try Double the Donation API first
      const dtdKey = await getKey("DOUBLE_THE_DONATION_API_KEY");
      if (dtdKey) {
        try {
          const response = await fetch(
            `https://doublethedonation.com/api/v2/companies/search?query=${encodeURIComponent(prospect.employer)}`,
            { headers: { "Authorization": `Bearer ${dtdKey}` } },
          );
          if (response.ok) {
            const data = await response.json();
            const company = data?.companies?.[0];
            if (company) {
              return {
                match_eligible: company.matching_gift_offered ?? false,
                match_ratio: company.match_ratio ?? 1,
                match_cap: company.match_cap ?? 0,
                programme_name: company.matching_gift_program_name || null,
                company_name: company.name,
                source: "double_the_donation",
              };
            }
          }
        } catch { /* fall through to Firecrawl */ }
      }

      // Fallback: use Firecrawl + AI to research matching programmes from public sources
      const firecrawlKey = await getKey("FIRECRAWL_API_KEY");
      if (firecrawlKey) {
        try {
          const domain = prospect.employer.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
          // Search for matching gift / CSR info on the company website
          const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `https://${domain}`,
              formats: ["extract"],
              extract: {
                schema: {
                  type: "object",
                  properties: {
                    has_matching_gift_programme: { type: "boolean", description: "Does this company offer a matching gift / donation matching programme for employees?" },
                    match_ratio: { type: "string", description: "The matching ratio (e.g. '1:1', '2:1', '0.5:1'). Return null if unknown." },
                    match_cap: { type: "string", description: "The maximum amount the company will match per employee per year (e.g. '$10,000'). Return null if unknown." },
                    programme_name: { type: "string", description: "The name of the matching gift or corporate giving programme" },
                    volunteer_grant_programme: { type: "boolean", description: "Does the company offer volunteer grants (donations for employee volunteer hours)?" },
                    csr_summary: { type: "string", description: "Brief summary of the company's CSR / corporate giving / community involvement" },
                    giving_page_url: { type: "string", description: "URL of the company's giving/matching/CSR page if found" },
                  },
                },
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const extract = data?.data?.extract || {};

            // Parse match ratio from string like "1:1" to number
            let matchRatio = 0;
            if (extract.match_ratio) {
              const parts = String(extract.match_ratio).split(":");
              if (parts.length === 2) matchRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
              else matchRatio = parseFloat(extract.match_ratio) || 0;
            }

            // Parse match cap from string like "$10,000" to number
            let matchCap = 0;
            if (extract.match_cap) {
              matchCap = parseFloat(String(extract.match_cap).replace(/[$,]/g, "")) || 0;
            }

            const matchEligible = extract.has_matching_gift_programme === true;

            // If Firecrawl found a match programme, return it
            if (matchEligible) {
              return {
                match_eligible: true,
                match_ratio: matchRatio,
                match_cap: matchCap,
                programme_name: extract.programme_name || null,
                volunteer_grants: extract.volunteer_grant_programme || false,
                csr_summary: extract.csr_summary || null,
                giving_page_url: extract.giving_page_url || null,
                source: "firecrawl_web_research",
                company_name: prospect.employer,
              };
            }
            // If Firecrawl didn't find it, fall through to AI research
            // (homepage often doesn't mention matching — AI knows from training data)
          }
        } catch (e) {
          // Fall through to AI-only research
        }
      }

      // Last resort: use AI to research based on general knowledge
      const anthropicKey = await getKey("ANTHROPIC_API_KEY");
      if (anthropicKey) {
        try {
          const { createAnthropic: createProvider } = await import("@ai-sdk/anthropic");
          const { generateText: genText } = await import("ai");
          const provider = createProvider({ apiKey: anthropicKey });
          const { text } = await genText({
            model: provider("claude-sonnet-4-20250514"),
            system: "You research corporate giving programmes. Return ONLY valid JSON.",
            prompt: `Does ${prospect.employer} have an employee matching gift programme? Return JSON: {"match_eligible": boolean, "match_ratio": number (e.g. 1 for 1:1), "match_cap": number (annual cap in USD, 0 if unknown), "programme_name": "string or null", "confidence": "high|medium|low", "notes": "brief explanation of what you know"}`,
            maxOutputTokens: 300,
          });

          try {
            const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return {
              match_eligible: parsed.match_eligible ?? false,
              match_ratio: parsed.match_ratio ?? 0,
              match_cap: parsed.match_cap ?? 0,
              programme_name: parsed.programme_name || null,
              confidence: parsed.confidence || "low",
              notes: parsed.notes || null,
              source: "ai_research",
              company_name: prospect.employer,
            };
          } catch {
            return { match_eligible: false, match_ratio: 0, match_cap: 0, note: "Could not parse AI response", source: "ai_research" };
          }
        } catch (e) {
          return { match_eligible: false, match_ratio: 0, match_cap: 0, note: `AI research failed: ${e instanceof Error ? e.message : "Unknown"}` };
        }
      }

      return { match_eligible: false, match_ratio: 0, match_cap: 0, note: "No API keys configured for matching gift research" };
    }

    case "company_research":
      return { company_name: prospect.employer || prospect.name, note: "Full company research requires API integration" };

    case "foundation_lookup":
      return { foundation_name: prospect.name, note: "Foundation lookup requires database integration" };

    case "grant_programmes":
      return { programme_name: "General Operating Support", note: "Stub — requires grant database" };

    case "eligibility_check":
      return { eligibility_score: 0.7, note: "Stub — requires AI scoring" };

    case "csr_signals":
      return { csr_budget_estimate: "Unknown", note: "Requires web scraping" };

    case "contact_enrichment":
      return { contact_name: null, contact_email: null, note: "Requires enrichment API" };

    case "volunteer_programme":
      return { programme_exists: false, note: "Requires web scraping" };

    case "coordinator_lookup":
      return { coordinator_name: null, note: "Requires enrichment API" };

    case "donation_programme":
      return { programme_exists: false, note: "Requires web scraping" };

    case "procurement_contact":
      return { contact_name: null, note: "Requires enrichment API" };

    case "website_intelligence": {
      const firecrawlKey = await getKey("FIRECRAWL_API_KEY");
      const companyName = prospect.employer || prospect.name;
      if (!firecrawlKey) {
        return { summary: companyName, note: "Firecrawl API key not configured" };
      }
      try {
        // Construct likely company URL
        const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: `https://${domain}`,
            formats: ["extract"],
            extract: {
              schema: {
                type: "object",
                properties: {
                  csr_programmes: { type: "array", items: { type: "string" } },
                  matching_gift_info: { type: "string" },
                  volunteer_programmes: { type: "string" },
                  company_values: { type: "array", items: { type: "string" } },
                  recent_news: { type: "array", items: { type: "string" } },
                  about_summary: { type: "string" },
                },
              },
            },
          }),
        });
        if (!response.ok) {
          return { summary: companyName, note: `Firecrawl error: ${response.status}` };
        }
        const data = await response.json();
        const extract = data?.data?.extract || {};
        return {
          summary: extract.about_summary || companyName,
          ...extract,
        };
      } catch (e) {
        return { summary: companyName, note: `Error: ${e instanceof Error ? e.message : "Unknown"}` };
      }
    }

    case "donor_score": {
      // Donor scoring reads ALL previous enrichment results and scores with AI
      const allResults = prospect._id ? await ctx.runQuery(
        internal.pipeline.helpers.getProspectEnrichmentResults,
        { prospectId: prospect._id as any, campaignId: args.campaignId as any },
      ) : [];

      const enrichmentContext: Record<string, unknown> = {};
      for (const r of allResults || []) {
        if (r.status === "success" && r.result) {
          enrichmentContext[r.enrichmentType] = r.result;
        }
      }

      const apiKey = await getKey("ANTHROPIC_API_KEY");
      if (!apiKey) {
        return { score: 50, reasoning: "No API key — default score", signals: [] };
      }

      try {
        const { createAnthropic: createProvider } = await import("@ai-sdk/anthropic");
        const { generateText: genText } = await import("ai");
        const provider = createProvider({ apiKey });
        const { text } = await genText({
          model: provider("claude-sonnet-4-20250514"),
          system: `Score this prospect 0-100 on likelihood to engage with non-profit outreach. Consider employer size, match programme, CSR activity, role seniority. Return ONLY valid JSON: {"score": number, "reasoning": "string", "signals": ["string"]}`,
          prompt: `Prospect: ${prospect.name}, ${prospect.employer || "unknown employer"}, ${prospect.email || ""}\n\nEnrichment data:\n${JSON.stringify(enrichmentContext, null, 2)}`,
          maxOutputTokens: 300,
        });

        try {
          // Strip markdown code fences if present
          const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return {
            score: Math.max(0, Math.min(100, parsed.score || 50)),
            reasoning: parsed.reasoning || "",
            signals: parsed.signals || [],
          };
        } catch {
          return { score: 50, reasoning: "Failed to parse AI score", signals: [] };
        }
      } catch (e) {
        return { score: 50, reasoning: `Error: ${e instanceof Error ? e.message : "Unknown"}`, signals: [] };
      }
    }

    case "ai_message":
      // AI message generation is handled by the pipeline engine (generateMessage),
      // not the enrichment runner. Mark as complete — the actual message is created separately.
      return { status: "handled_by_pipeline", note: "Message generation runs after all enrichments complete" };

    default:
      return { note: `No handler for enrichment type: ${enrichmentType}` };
  }
}
