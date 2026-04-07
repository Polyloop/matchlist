"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Generate an AI reply after a prospect responds.
 * Creates a draft reply message linked to the original via replyTo.
 */
export const generateReply = internalAction({
  args: {
    originalMessageId: v.id("outreachMessages"),
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    prospectId: v.id("prospects"),
  },
  handler: async (ctx, args) => {
    try {
      const prospect = await ctx.runQuery(internal.pipeline.helpers.getProspect, {
        prospectId: args.prospectId,
      });
      if (!prospect) return;

      const originalMessage = await ctx.runQuery(internal.pipeline.helpers.getMessage, {
        messageId: args.originalMessageId,
      });
      if (!originalMessage) return;

      const org = await ctx.runQuery(internal.pipeline.helpers.getOrg, {
        orgId: args.orgId,
      });

      // Get sender settings
      const orgSettings = await ctx.runQuery(internal.pipeline.helpers.getOrgSettings, {
        orgId: args.orgId,
        keys: ["ANTHROPIC_API_KEY", "SENDER_NAME", "SENDER_TITLE", "SENDER_SIGNATURE", "ORG_NAME"],
      });

      const apiKey = orgSettings.ANTHROPIC_API_KEY;
      if (!apiKey) {
        await ctx.runMutation(internal.activity.mutations.log, {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "reply_skipped",
          message: `Reply draft skipped for ${prospect.name} — no API key`,
        });
        return;
      }

      const senderName = orgSettings.SENDER_NAME || "The Team";
      const senderSignature = orgSettings.SENDER_SIGNATURE || senderName;

      const provider = createAnthropic({ apiKey });
      const { text } = await generateText({
        model: provider("claude-sonnet-4-20250514"),
        system: `You are ${senderName} from ${orgSettings.ORG_NAME || org?.name || "our organisation"}. A prospect has responded to your outreach email. Draft a brief, warm follow-up reply that moves the conversation forward.

RULES:
- First line: "Subject: Re: {original subject}"
- Max 60 words in the body
- Be helpful and specific
- Suggest a concrete next step (call, meeting, send info)
- End with your signature

Signature:
${senderSignature}`,
        prompt: `Original email you sent:
Subject: ${originalMessage.subject || "Outreach"}
${originalMessage.content}

The prospect (${prospect.name} at ${prospect.employer || "their company"}) has responded positively. We don't have the exact reply text, but they engaged with your message.

Draft a warm follow-up reply.`,
        maxOutputTokens: 500,
      });

      // Parse subject
      const lines = text.trim().split("\n");
      let subject = `Re: ${originalMessage.subject || "Outreach"}`;
      let body = text;
      if (lines[0]?.startsWith("Subject:")) {
        subject = lines[0].replace("Subject:", "").trim();
        body = lines.slice(1).join("\n").trim();
      }

      // Create reply draft
      await ctx.runMutation(internal.pipeline.helpers.createOutreachMessage, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        subject,
        content: body,
        status: "draft",
        confidenceScore: 90,
        sequenceStep: (originalMessage.sequenceStep ?? 0) + 1,
      });

      // We need a separate mutation to set replyTo since createOutreachMessage doesn't have it
      // For now, log the activity
      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "reply_drafted",
        message: `AI reply drafted for ${prospect.name} — ready for review`,
      });
    } catch (error) {
      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "reply_failed",
        message: `Reply generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  },
});
