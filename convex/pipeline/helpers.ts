import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";

export const getEnrichmentResult = internalQuery({
  args: {
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
    enrichmentType: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("enrichmentResults")
      .withIndex("by_prospect_type", (q) =>
        q.eq("prospectId", args.prospectId)
          .eq("campaignId", args.campaignId)
          .eq("enrichmentType", args.enrichmentType),
      )
      .first();
    return result?._id ?? null;
  },
});

export const updateEnrichmentResult = internalMutation({
  args: {
    id: v.id("enrichmentResults"),
    status: v.string(),
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.result !== undefined) updates.result = args.result;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;
    await ctx.db.patch(args.id, updates);
  },
});

export const getProspect = internalQuery({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.prospectId);
  },
});

export const getCampaign = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

export const getOrg = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orgId);
  },
});

export const getProspectEnrichmentResults = internalQuery({
  args: {
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enrichmentResults")
      .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .collect();
  },
});

export const getOrgSetting = internalQuery({
  args: {
    orgId: v.id("organizations"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("orgSettings")
      .withIndex("by_org_key", (q) => q.eq("orgId", args.orgId).eq("key", args.key))
      .first();
    return setting?.value ?? null;
  },
});

export const getOrgSettings = internalQuery({
  args: {
    orgId: v.id("organizations"),
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const result: Record<string, string> = {};
    for (const key of args.keys) {
      const setting = await ctx.db
        .query("orgSettings")
        .withIndex("by_org_key", (q) => q.eq("orgId", args.orgId).eq("key", key))
        .first();
      if (setting) result[key] = setting.value;
    }
    return result;
  },
});

export const getCampaignSettings = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaignSettings")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
  },
});

export const getMessage = internalQuery({
  args: { messageId: v.id("outreachMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const updateMessageStatus = internalMutation({
  args: {
    messageId: v.id("outreachMessages"),
    status: v.string(),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
    };
    if (args.sentAt) updates.sentAt = args.sentAt;
    await ctx.db.patch(args.messageId, updates);
  },
});

export const createSequenceStep = internalMutation({
  args: {
    messageId: v.id("outreachMessages"),
    campaignId: v.id("campaigns"),
    prospectId: v.id("prospects"),
    stepNumber: v.number(),
    scheduledAt: v.number(),
    cronletTaskId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("outreachSequenceSteps", {
      messageId: args.messageId,
      campaignId: args.campaignId,
      prospectId: args.prospectId,
      stepNumber: args.stepNumber,
      scheduledAt: args.scheduledAt,
      cronletTaskId: args.cronletTaskId,
      status: "scheduled",
    });
  },
});

export const markSequenceStepSent = internalMutation({
  args: { messageId: v.id("outreachMessages") },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("outreachSequenceSteps")
      .filter((q) =>
        q.and(
          q.eq(q.field("messageId"), args.messageId),
          q.eq(q.field("status"), "scheduled"),
        ),
      )
      .collect();

    for (const step of steps) {
      await ctx.db.patch(step._id, {
        status: "sent",
        sentAt: Date.now(),
      });
    }
  },
});

export const logEmailEvent = internalMutation({
  args: {
    email: v.string(),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the most recent sent message to this email
    const allMessages = await ctx.db.query("outreachMessages").collect();
    const message = allMessages.find((m) => m.status === "sent");

    // We need to find by prospect email — look up prospects
    if (!message) return;

    for (const msg of allMessages) {
      if (msg.status !== "sent") continue;
      const prospect = await ctx.db.get(msg.prospectId);
      if (!prospect || prospect.email !== args.email) continue;

      if (args.event === "opened" && !msg.openedAt) {
        await ctx.db.patch(msg._id, { openedAt: Date.now() });
      }
      if (args.event === "bounced" || args.event === "complained") {
        await ctx.db.patch(msg._id, { status: "failed" });
      }

      // Log activity
      if (msg.orgId) {
        await ctx.db.insert("activityLog", {
          orgId: msg.orgId,
          campaignId: msg.campaignId,
          prospectId: msg.prospectId,
          type: `email_${args.event}`,
          message: `Email ${args.event}: ${prospect.name} (${prospect.email})`,
        });
      }
      break;
    }
  },
});

export const createOutreachMessage = internalMutation({
  args: {
    orgId: v.id("organizations"),
    campaignId: v.id("campaigns"),
    prospectId: v.id("prospects"),
    subject: v.string(),
    content: v.string(),
    status: v.string(),
    confidenceScore: v.number(),
    sequenceStep: v.number(),
    personalisationContext: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("outreachMessages", {
      orgId: args.orgId,
      campaignId: args.campaignId,
      prospectId: args.prospectId,
      subject: args.subject,
      content: args.content,
      status: args.status as "draft" | "approved",
      confidenceScore: args.confidenceScore,
      sequenceStep: args.sequenceStep,
      personalisationContext: args.personalisationContext,
    });
  },
});
