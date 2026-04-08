import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const saveClassification = internalMutation({
  args: {
    messageId: v.id("outreachMessages"),
    intent: v.string(),
    responseText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      responseIntent: args.intent,
      responseText: args.responseText,
      responseClassifiedAt: Date.now(),
    });
  },
});

export const routeIntent = internalMutation({
  args: {
    messageId: v.id("outreachMessages"),
    orgId: v.id("organizations"),
    campaignId: v.id("campaigns"),
    prospectId: v.id("prospects"),
    intent: v.string(),
    reasoning: v.string(),
    suggestedAction: v.string(),
    extractedInfo: v.any(),
  },
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.prospectId);
    const name = prospect?.name || "prospect";

    switch (args.intent) {
      case "interested":
      case "positive":
      case "question": {
        // Update engagement status
        await ctx.db.patch(args.prospectId, { engagementStatus: "active" });

        // Generate tailored reply
        await ctx.scheduler.runAfter(0, internal.pipeline.replyGenerator.generateReply, {
          originalMessageId: args.messageId,
          campaignId: args.campaignId,
          orgId: args.orgId,
          prospectId: args.prospectId,
        });

        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "intent_classified",
          message: `${name}: ${args.intent} — ${args.reasoning}. AI reply being drafted.`,
          metadata: { intent: args.intent, suggestedAction: args.suggestedAction },
        });
        break;
      }

      case "referral": {
        await ctx.db.patch(args.prospectId, { engagementStatus: "active" });

        const info = args.extractedInfo as Record<string, string>;
        let referralNote = `${name} referred to someone else.`;
        if (info?.referralName) {
          referralNote = `${name} referred to ${info.referralName}${info.referralEmail ? ` (${info.referralEmail})` : ""}.`;
        }

        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "intent_referral",
          message: referralNote + " AI reply being drafted to acknowledge.",
          metadata: { intent: "referral", ...info },
        });

        // Still generate a reply to acknowledge the referral
        await ctx.scheduler.runAfter(0, internal.pipeline.replyGenerator.generateReply, {
          originalMessageId: args.messageId,
          campaignId: args.campaignId,
          orgId: args.orgId,
          prospectId: args.prospectId,
        });
        break;
      }

      case "not_now": {
        await ctx.db.patch(args.prospectId, { engagementStatus: "lapsed" });

        // Cancel current sequences
        const steps = await ctx.db
          .query("outreachSequenceSteps")
          .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
          .collect();
        for (const step of steps) {
          if (step.status === "scheduled") {
            await ctx.db.patch(step._id, { status: "cancelled" });
          }
        }

        // Schedule re-engagement in 30 days via Cronlet
        await ctx.scheduler.runAfter(0, internal.pipeline.scheduler.scheduleFollowUp, {
          campaignId: args.campaignId,
          orgId: args.orgId,
          prospectId: args.prospectId,
          prospectName: name,
          delayDays: 30,
          stepNumber: 99, // special re-engagement step
        });

        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "intent_not_now",
          message: `${name}: not now — re-engagement scheduled in 30 days. ${args.reasoning}`,
          metadata: { intent: "not_now" },
        });
        break;
      }

      case "declined": {
        await ctx.db.patch(args.prospectId, { engagementStatus: "disengaged" });

        // Cancel ALL sequences
        const allSteps = await ctx.db
          .query("outreachSequenceSteps")
          .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
          .collect();
        for (const step of allSteps) {
          if (step.status === "scheduled") {
            await ctx.db.patch(step._id, { status: "cancelled" });
          }
        }

        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "intent_declined",
          message: `${name}: declined — all automation stopped. ${args.reasoning}`,
          metadata: { intent: "declined" },
        });
        break;
      }

      case "out_of_office": {
        // Reschedule for +7 days
        await ctx.scheduler.runAfter(0, internal.pipeline.scheduler.scheduleFollowUp, {
          campaignId: args.campaignId,
          orgId: args.orgId,
          prospectId: args.prospectId,
          prospectName: name,
          delayDays: 7,
          stepNumber: 0,
        });

        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: args.campaignId,
          prospectId: args.prospectId,
          type: "intent_ooo",
          message: `${name}: out of office — rescheduled for 7 days. ${args.reasoning}`,
          metadata: { intent: "out_of_office" },
        });
        break;
      }
    }
  },
});
