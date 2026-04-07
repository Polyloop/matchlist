"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { CloudClient } from "@cronlet/sdk";

function getCronletClient(): CloudClient {
  const apiKey = process.env.CRONLET_API_KEY;
  if (!apiKey) throw new Error("CRONLET_API_KEY not set");
  return new CloudClient({
    apiKey,
    baseUrl: process.env.CRONLET_BASE_URL || "https://api.cronlet.dev",
  });
}

/**
 * Schedule an email send via Cronlet.
 * Cronlet fires a webhook to our HTTP callback, which triggers the actual Resend delivery.
 */
export const scheduleSend = internalAction({
  args: {
    messageId: v.id("outreachMessages"),
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    prospectId: v.id("prospects"),
    prospectName: v.string(),
    sendAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cronlet = getCronletClient();

    // Get campaign settings for send window
    const settings = await ctx.runQuery(
      internal.pipeline.helpers.getCampaignSettings,
      { campaignId: args.campaignId },
    );

    // Calculate optimal send time
    const sendTime = args.sendAt || calculateSendTime(settings);

    const callbackUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
      ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/cronlet/callback`
      : "https://acoustic-seal-577.convex.site/cronlet/callback";

    // Create a one-time Cronlet task to trigger the send
    const task = await cronlet.tasks.create({
      name: `Send email: ${args.prospectName}`,
      description: `Deliver outreach email to ${args.prospectName}`,
      handler: {
        type: "webhook",
        url: callbackUrl,
        method: "POST",
      },
      schedule: { type: "once", at: sendTime },
      timezone: settings?.sendTimezone || "Europe/London",
      callbackUrl,
      timeout: "30s",
      retryAttempts: 2,
      retryBackoff: "linear",
      retryDelay: "5s",
      maxRuns: 1,
      active: true,
      metadata: {
        action: "send_email",
        messageId: args.messageId as string,
        campaignId: args.campaignId as string,
        orgId: args.orgId as string,
        prospectId: args.prospectId as string,
      },
    });

    // Store the Cronlet task ID and create a sequence step
    await ctx.runMutation(internal.pipeline.helpers.createSequenceStep, {
      messageId: args.messageId,
      campaignId: args.campaignId,
      prospectId: args.prospectId,
      stepNumber: 0,
      scheduledAt: new Date(sendTime).getTime(),
      cronletTaskId: task.id,
    });

    await ctx.runMutation(internal.activity.mutations.log, {
      orgId: args.orgId,
      campaignId: args.campaignId,
      prospectId: args.prospectId,
      type: "send_scheduled",
      message: `Email to ${args.prospectName} scheduled for ${sendTime}`,
      metadata: { cronletTaskId: task.id, sendTime },
    });
  },
});

/**
 * Schedule a follow-up check via Cronlet.
 */
export const scheduleFollowUp = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    prospectId: v.id("prospects"),
    prospectName: v.string(),
    delayDays: v.number(),
    stepNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const cronlet = getCronletClient();

    const settings = await ctx.runQuery(
      internal.pipeline.helpers.getCampaignSettings,
      { campaignId: args.campaignId },
    );

    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + args.delayDays);
    // Set to 10am in the send window
    followUpDate.setHours(settings?.sendWindowStart || 10, 0, 0, 0);

    const callbackUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
      ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/cronlet/callback`
      : "https://acoustic-seal-577.convex.site/cronlet/callback";

    await cronlet.tasks.create({
      name: `Follow-up #${args.stepNumber}: ${args.prospectName}`,
      description: `Check if ${args.prospectName} responded, generate follow-up if not`,
      handler: {
        type: "webhook",
        url: callbackUrl,
        method: "POST",
      },
      schedule: { type: "once", at: followUpDate.toISOString() },
      timezone: settings?.sendTimezone || "Europe/London",
      callbackUrl,
      timeout: "60s",
      retryAttempts: 1,
      retryBackoff: "linear",
      retryDelay: "5s",
      maxRuns: 1,
      active: true,
      metadata: {
        action: "follow_up",
        campaignId: args.campaignId as string,
        orgId: args.orgId as string,
        prospectId: args.prospectId as string,
        stepNumber: args.stepNumber,
      },
    });

    await ctx.runMutation(internal.activity.mutations.log, {
      orgId: args.orgId,
      campaignId: args.campaignId,
      prospectId: args.prospectId,
      type: "follow_up_scheduled",
      message: `Follow-up #${args.stepNumber} for ${args.prospectName} scheduled in ${args.delayDays} days`,
    });
  },
});

/**
 * Calculate optimal send time within the send window.
 */
function calculateSendTime(
  settings: { sendWindowStart: number; sendWindowEnd: number; sendTimezone: string } | null,
): string {
  const now = new Date();
  const windowStart = settings?.sendWindowStart ?? 9;
  const windowEnd = settings?.sendWindowEnd ?? 17;

  // Target: next available slot in the send window
  const targetHour = now.getHours();

  if (targetHour >= windowStart && targetHour < windowEnd) {
    // Within window — send in 5-15 minutes (add jitter)
    const jitterMinutes = 5 + Math.floor(Math.random() * 10);
    now.setMinutes(now.getMinutes() + jitterMinutes);
  } else if (targetHour < windowStart) {
    // Before window — send at window start + jitter
    now.setHours(windowStart, Math.floor(Math.random() * 30), 0, 0);
  } else {
    // After window — send tomorrow at window start + jitter
    now.setDate(now.getDate() + 1);
    now.setHours(windowStart, Math.floor(Math.random() * 30), 0, 0);
  }

  return now.toISOString();
}
