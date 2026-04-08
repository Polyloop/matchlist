"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Classify the intent of a prospect's response and route to the right action.
 */
export const classifyAndRoute = internalAction({
  args: {
    messageId: v.id("outreachMessages"),
    orgId: v.id("organizations"),
    campaignId: v.id("campaigns"),
    prospectId: v.id("prospects"),
    responseText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const apiKey = await ctx.runQuery(internal.pipeline.helpers.getOrgSetting, {
      orgId: args.orgId,
      key: "ANTHROPIC_API_KEY",
    });

    if (!apiKey) return;

    const originalMessage = await ctx.runQuery(internal.pipeline.helpers.getMessage, {
      messageId: args.messageId,
    });

    const prospect = await ctx.runQuery(internal.pipeline.helpers.getProspect, {
      prospectId: args.prospectId,
    });

    if (!originalMessage || !prospect) return;

    const provider = createAnthropic({ apiKey });

    // If no response text, use a generic classification
    const hasText = args.responseText && args.responseText.trim().length > 0;

    const { text } = await generateText({
      model: provider("claude-sonnet-4-20250514"),
      system: `You classify the intent of responses to nonprofit outreach emails. Return ONLY valid JSON:
{
  "intent": "interested" | "positive" | "question" | "referral" | "not_now" | "declined" | "out_of_office",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "suggestedAction": "what to do next",
  "extractedInfo": { "referralName": null, "referralEmail": null, "returnDate": null }
}

Intent definitions:
- interested: wants more info, open to conversation
- positive: agreed, will take action (submit match, donate, etc.)
- question: asking for clarification about the programme
- referral: directing to someone else ("talk to my colleague X")
- not_now: timing isn't right, but not a hard no
- declined: clear no, not interested, unsubscribe
- out_of_office: auto-reply, away message`,
      prompt: hasText
        ? `Original outreach:\nSubject: ${originalMessage.subject}\n${originalMessage.content}\n\nProspect's response:\n${args.responseText}`
        : `Original outreach:\nSubject: ${originalMessage.subject}\n${originalMessage.content}\n\nThe prospect responded but we don't have the reply text. They engaged with the email. Classify as best you can — default to "interested" if unclear.`,
      maxOutputTokens: 300,
    });

    let classification;
    try {
      classification = JSON.parse(text);
    } catch {
      classification = {
        intent: "interested",
        confidence: 0.5,
        reasoning: "Could not parse AI response",
        suggestedAction: "Review manually",
        extractedInfo: {},
      };
    }

    // Save classification to the message
    await ctx.runMutation(internal.pipeline.intentRouter.saveClassification, {
      messageId: args.messageId,
      intent: classification.intent,
      responseText: args.responseText,
    });

    // Route based on intent
    await ctx.runMutation(internal.pipeline.intentRouter.routeIntent, {
      messageId: args.messageId,
      orgId: args.orgId,
      campaignId: args.campaignId,
      prospectId: args.prospectId,
      intent: classification.intent,
      reasoning: classification.reasoning,
      suggestedAction: classification.suggestedAction,
      extractedInfo: classification.extractedInfo || {},
    });
  },
});
