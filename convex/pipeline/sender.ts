"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Resend } from "resend";

/**
 * Send an email via Resend.
 * Called by Cronlet callback when a scheduled send fires.
 */
export const sendEmail = internalAction({
  args: {
    messageId: v.id("outreachMessages"),
    orgId: v.id("organizations"),
    campaignId: v.id("campaigns"),
    prospectId: v.id("prospects"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (!apiKey) {
      await ctx.runMutation(internal.pipeline.helpers.updateMessageStatus, {
        messageId: args.messageId,
        status: "failed",
      });
      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "send_failed",
        message: "Email delivery failed — RESEND_API_KEY not configured",
      });
      return;
    }

    // Get message and prospect data
    const message = await ctx.runQuery(
      internal.pipeline.helpers.getMessage,
      { messageId: args.messageId },
    );
    if (!message) return;

    const prospect = await ctx.runQuery(
      internal.pipeline.helpers.getProspect,
      { prospectId: args.prospectId },
    );
    if (!prospect || !prospect.email) {
      await ctx.runMutation(internal.pipeline.helpers.updateMessageStatus, {
        messageId: args.messageId,
        status: "failed",
      });
      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "send_failed",
        message: `Email delivery failed — no email address for ${prospect?.name || "prospect"}`,
      });
      return;
    }

    try {
      const resend = new Resend(apiKey);

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: prospect.email,
        subject: message.subject || `Message from our team`,
        text: message.content,
      });

      if (error) {
        await ctx.runMutation(internal.pipeline.helpers.updateMessageStatus, {
          messageId: args.messageId,
          status: "failed",
        });
        await ctx.runMutation(internal.activity.mutations.log, {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "send_failed",
          message: `Email to ${prospect.name} failed: ${error.message}`,
          metadata: { error: error.message },
        });
        return;
      }

      // Mark as sent
      await ctx.runMutation(internal.pipeline.helpers.updateMessageStatus, {
        messageId: args.messageId,
        status: "sent",
        sentAt: Date.now(),
      });

      // Update sequence step
      await ctx.runMutation(internal.pipeline.helpers.markSequenceStepSent, {
        messageId: args.messageId,
      });

      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "message_sent",
        message: `Email delivered to ${prospect.name} (${prospect.email})`,
        metadata: { resendId: data?.id },
      });

      // Schedule follow-up if enabled
      const settings = await ctx.runQuery(
        internal.pipeline.helpers.getCampaignSettings,
        { campaignId: args.campaignId },
      );

      if (settings?.followUpEnabled) {
        const currentStep = message.sequenceStep ?? 0;
        if (currentStep < (settings.followUpMaxAttempts ?? 2)) {
          await ctx.scheduler.runAfter(0, internal.pipeline.scheduler.scheduleFollowUp, {
            campaignId: args.campaignId,
            orgId: args.orgId,
            prospectId: args.prospectId,
            prospectName: prospect.name,
            delayDays: settings.followUpDelayDays ?? 5,
            stepNumber: currentStep + 1,
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.pipeline.helpers.updateMessageStatus, {
        messageId: args.messageId,
        status: "failed",
      });
      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        prospectId: args.prospectId,
        type: "send_failed",
        message: `Email delivery error: ${errorMsg}`,
      });
    }
  },
});
