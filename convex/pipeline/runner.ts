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
      });

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
  prospect: { name: string; email?: string; employer?: string; linkedinUrl?: string },
  ctx: { runQuery: Function },
  args: { orgId: string },
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
      const apiKey = await getKey("BRIGHT_DATA_API_KEY");
      if (!apiKey || !prospect.linkedinUrl) {
        return {
          profile_url: prospect.linkedinUrl || null,
          scraped: false,
          ...(prospect.employer ? { employer: prospect.employer } : {}),
          note: !apiKey ? "Bright Data API key not configured" : "No LinkedIn URL provided",
        };
      }
      // Call Bright Data LinkedIn scraping API
      try {
        const response = await fetch("https://api.brightdata.com/datasets/v3/trigger", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deliver_to: "api",
            input: [{ url: prospect.linkedinUrl }],
          }),
        });
        if (!response.ok) {
          return { profile_url: prospect.linkedinUrl, scraped: false, note: `Bright Data error: ${response.status}` };
        }
        const data = await response.json();
        return {
          profile_url: prospect.linkedinUrl,
          scraped: true,
          employer: data?.current_company || prospect.employer || null,
          title: data?.current_title || null,
          location: data?.location || null,
          headline: data?.headline || null,
        };
      } catch (e) {
        return { profile_url: prospect.linkedinUrl, scraped: false, note: `Error: ${e instanceof Error ? e.message : "Unknown"}` };
      }
    }

    case "employer_lookup":
      return { employer: prospect.employer || null };

    case "match_programme": {
      const apiKey = await getKey("DOUBLE_THE_DONATION_API_KEY");
      if (!apiKey || !prospect.employer) {
        return {
          match_eligible: false,
          match_ratio: 0,
          match_cap: 0,
          note: !apiKey ? "Double the Donation API key not configured" : "No employer to look up",
        };
      }
      // Call Double the Donation API
      try {
        const response = await fetch(
          `https://doublethedonation.com/api/v2/companies/search?query=${encodeURIComponent(prospect.employer)}`,
          { headers: { "Authorization": `Bearer ${apiKey}` } },
        );
        if (!response.ok) {
          return { match_eligible: false, match_ratio: 0, match_cap: 0, note: `API error: ${response.status}` };
        }
        const data = await response.json();
        const company = data?.companies?.[0];
        if (!company) {
          return { match_eligible: false, match_ratio: 0, match_cap: 0, note: "No matching company found" };
        }
        return {
          match_eligible: company.matching_gift_offered ?? false,
          match_ratio: company.match_ratio ?? 1,
          match_cap: company.match_cap ?? 0,
          programme_name: company.matching_gift_program_name || null,
          company_name: company.name,
        };
      } catch (e) {
        return { match_eligible: false, match_ratio: 0, match_cap: 0, note: `Error: ${e instanceof Error ? e.message : "Unknown"}` };
      }
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

    default:
      return { note: `No handler for enrichment type: ${enrichmentType}` };
  }
}
