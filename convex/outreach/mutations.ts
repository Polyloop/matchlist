import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireOrg } from "../lib/auth";

export const approve = mutation({
  args: { id: v.id("outreachMessages") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const msg = await ctx.db.get(args.id);
    if (!msg || msg.orgId !== orgId) throw new Error("Not found");
    if (msg.status !== "draft") throw new Error("Can only approve drafts");

    await ctx.db.patch(args.id, { status: "approved" });
  },
});

export const bulkApprove = mutation({
  args: { ids: v.array(v.id("outreachMessages")) },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    let count = 0;
    for (const id of args.ids) {
      const msg = await ctx.db.get(id);
      if (msg && msg.orgId === orgId && msg.status === "draft") {
        await ctx.db.patch(id, { status: "approved" });
        count++;
      }
    }
    return { approved: count };
  },
});

export const bulkSend = mutation({
  args: { ids: v.array(v.id("outreachMessages")) },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    let count = 0;
    for (const id of args.ids) {
      const msg = await ctx.db.get(id);
      if (msg && msg.orgId === orgId && msg.status === "approved") {
        // TODO: Schedule send action via ctx.scheduler
        count++;
      }
    }
    return { triggered: count };
  },
});

export const sendNow = mutation({
  args: { id: v.id("outreachMessages") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const msg = await ctx.db.get(args.id);
    if (!msg || msg.orgId !== orgId) throw new Error("Not found");
    if (msg.status !== "approved") throw new Error("Message must be approved first");

    // Trigger immediate send via the sender action
    await ctx.scheduler.runAfter(0, internal.pipeline.sender.sendEmail, {
      messageId: args.id,
      orgId,
      campaignId: msg.campaignId!,
      prospectId: msg.prospectId,
    });
  },
});

export const updateContent = mutation({
  args: {
    id: v.id("outreachMessages"),
    subject: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const msg = await ctx.db.get(args.id);
    if (!msg || msg.orgId !== orgId) throw new Error("Not found");

    const updates: Record<string, unknown> = { content: args.content };
    if (args.subject !== undefined) updates.subject = args.subject;
    await ctx.db.patch(args.id, updates);
  },
});

export const markResponded = mutation({
  args: {
    id: v.id("outreachMessages"),
    responseText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const msg = await ctx.db.get(args.id);
    if (!msg || msg.orgId !== orgId) throw new Error("Not found");

    // Mark message as responded
    await ctx.db.patch(args.id, {
      respondedAt: Date.now(),
      responseText: args.responseText,
    });

    // Cancel all future follow-up sequence steps for this prospect
    const steps = await ctx.db
      .query("outreachSequenceSteps")
      .withIndex("by_prospect", (q) => q.eq("prospectId", msg.prospectId))
      .collect();

    for (const step of steps) {
      if (step.status === "scheduled") {
        await ctx.db.patch(step._id, { status: "responded" });
      }
    }

    // Log activity
    const prospect = await ctx.db.get(msg.prospectId);
    await ctx.db.insert("activityLog", {
      orgId,
      campaignId: msg.campaignId,
      prospectId: msg.prospectId,
      type: "response_received",
      message: `Response received from ${prospect?.name || "prospect"}`,
    });

    // Schedule intent classification + routing (replaces generic reply generation)
    if (msg.campaignId) {
      await ctx.scheduler.runAfter(0, internal.pipeline.intentClassifier.classifyAndRoute, {
        messageId: args.id,
        orgId,
        campaignId: msg.campaignId,
        prospectId: msg.prospectId,
        responseText: args.responseText,
      });
    }
  },
});

export const discard = mutation({
  args: { id: v.id("outreachMessages") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const msg = await ctx.db.get(args.id);
    if (!msg || msg.orgId !== orgId) throw new Error("Not found");

    await ctx.db.delete(args.id);
  },
});
