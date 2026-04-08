"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Generate an AI intelligence summary for a prospect.
 * Analyses all enrichment data, outreach history, and engagement signals
 * to produce a relationship summary and suggested next action.
 */
export const generateIntelligence = internalAction({
  args: {
    prospectId: v.id("prospects"),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Record<string, unknown> | null> => {
    const prospect = await ctx.runQuery(internal.pipeline.helpers.getProspect, {
      prospectId: args.prospectId,
    });
    if (!prospect) return null;

    // Get all enrichment results across campaigns
    const allResults = await ctx.runQuery(
      internal.prospects.intelligenceQueries.getProspectFullContext,
      { prospectId: args.prospectId, orgId: args.orgId },
    );

    const apiKey = await ctx.runQuery(internal.pipeline.helpers.getOrgSetting, {
      orgId: args.orgId,
      key: "ANTHROPIC_API_KEY",
    });

    if (!apiKey) return null;

    const provider = createAnthropic({ apiKey });

    const { text } = await generateText({
      model: provider("claude-sonnet-4-20250514"),
      system: `You are an intelligent relationship manager for a non-profit. Analyse this prospect's data and return ONLY valid JSON with these fields:
{
  "summary": "One sentence relationship summary (who they are, key facts, engagement level)",
  "affinitySignals": ["array of short signal tags like 'match eligible', 'senior role', 'opened email', 'gala attendee'"],
  "suggestedAction": "One specific next action recommendation",
  "suggestedActionReason": "Brief reason why this action matters now",
  "relationshipStrength": "cold|warm|engaged|active"
}`,
      prompt: `Prospect: ${prospect.name}
Email: ${prospect.email || "unknown"}
Employer: ${prospect.employer || "unknown"}
Match Eligible: ${prospect.matchEligible}
Match Ratio: ${prospect.employerMatchRatio || "unknown"}
Match Cap: ${prospect.employerMatchCap || "unknown"}
Donor Score: ${prospect.donorScore || "not scored"}

Enrichment Data:
${JSON.stringify(allResults.enrichments, null, 2)}

Outreach History:
${JSON.stringify(allResults.messages, null, 2)}

Activity Timeline:
${JSON.stringify(allResults.timeline, null, 2)}`,
      maxOutputTokens: 500,
    });

    try {
      return JSON.parse(text);
    } catch {
      return {
        summary: `${prospect.name} at ${prospect.employer || "unknown employer"}`,
        affinitySignals: prospect.matchEligible ? ["match eligible"] : [],
        suggestedAction: "Run enrichment pipeline",
        suggestedActionReason: "More data needed for personalised outreach",
        relationshipStrength: "cold",
      };
    }
  },
});
