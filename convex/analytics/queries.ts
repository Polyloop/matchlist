import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const global = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const totalProspects = prospects.length;
    const matchEligible = prospects.filter((p) => p.matchEligible).length;

    const sent = messages.filter((m) => m.status === "sent").length;
    const drafts = messages.filter((m) => m.status === "draft").length;
    const approved = messages.filter((m) => m.status === "approved").length;
    const responded = messages.filter((m) => m.respondedAt).length;

    return {
      activeCampaigns,
      totalCampaigns: campaigns.length,
      totalProspects,
      matchEligible,
      messagesSent: sent,
      messagesDraft: drafts,
      messagesApproved: approved,
      responsesReceived: responded,
      responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
    };
  },
});

export const campaignAnalytics = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.orgId !== auth.orgId) return null;

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const enrichmentResults = await ctx.db
      .query("enrichmentResults")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const sequenceSteps = await ctx.db
      .query("outreachSequenceSteps")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    // Enrichment breakdown by type
    const enrichmentByType: Record<string, { pending: number; running: number; success: number; failed: number }> = {};
    for (const r of enrichmentResults) {
      if (!enrichmentByType[r.enrichmentType]) {
        enrichmentByType[r.enrichmentType] = { pending: 0, running: 0, success: 0, failed: 0 };
      }
      enrichmentByType[r.enrichmentType][r.status as "pending" | "running" | "success" | "failed"]++;
    }

    // Outreach breakdown
    const outreach = {
      draft: messages.filter((m) => m.status === "draft").length,
      approved: messages.filter((m) => m.status === "approved").length,
      sent: messages.filter((m) => m.status === "sent").length,
      failed: messages.filter((m) => m.status === "failed").length,
      opened: messages.filter((m) => m.openedAt).length,
      responded: messages.filter((m) => m.respondedAt).length,
    };

    // Employer distribution
    const employerMap = new Map<string, number>();
    for (const p of prospects) {
      const employer = p.employer || "Unknown";
      employerMap.set(employer, (employerMap.get(employer) || 0) + 1);
    }
    const employers = Array.from(employerMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Schedule overview
    const scheduled = sequenceSteps.filter((s) => s.status === "scheduled").length;
    const stepsSent = sequenceSteps.filter((s) => s.status === "sent").length;

    return {
      totalProspects: prospects.length,
      enrichmentByType,
      outreach,
      employers,
      schedule: { scheduled, sent: stepsSent },
    };
  },
});

export const sendSchedule = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    let steps;
    if (args.campaignId) {
      const cId = args.campaignId;
      steps = await ctx.db
        .query("outreachSequenceSteps")
        .withIndex("by_campaign", (q) => q.eq("campaignId", cId))
        .collect();
    } else {
      // Get all scheduled steps across campaigns
      steps = await ctx.db
        .query("outreachSequenceSteps")
        .withIndex("by_scheduled", (q) => q.eq("status", "scheduled"))
        .collect();
    }

    // Join with prospect names
    const result = await Promise.all(
      steps.map(async (s) => {
        const prospect = await ctx.db.get(s.prospectId);
        const message = await ctx.db.get(s.messageId);
        return {
          ...s,
          prospectName: prospect?.name || "Unknown",
          subject: message?.subject || "Untitled",
        };
      }),
    );

    return result.sort((a, b) => a.scheduledAt - b.scheduledAt);
  },
});
