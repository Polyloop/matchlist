import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Check all trigger conditions for an org and take autonomous actions.
 */
export const checkAndAct = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    // Get all data for this org
    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeCampaigns = campaigns.filter((c) => c.status === "active");
    if (activeCampaigns.length === 0) return;

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const enrichments = await ctx.db
      .query("enrichmentResults")
      .collect();
    const orgEnrichments = enrichments.filter((e) => e.orgId === args.orgId);

    let actionsThisScan = 0;

    // --- Trigger: Auto-retry failed enrichments ---
    const failedEnrichments = orgEnrichments.filter((e) => e.status === "failed");
    for (const failed of failedEnrichments.slice(0, 5)) { // max 5 retries per scan
      // Only retry if it's been more than 1 hour since last attempt
      if (failed._creationTime && now - failed._creationTime > 60 * 60 * 1000) {
        await ctx.db.patch(failed._id, { status: "pending", errorMessage: undefined });
        actionsThisScan++;
      }
    }

    if (failedEnrichments.length > 0 && actionsThisScan > 0) {
      await ctx.db.insert("activityLog", {
        orgId: args.orgId,
        type: "agent_action",
        message: `Agent: Retried ${actionsThisScan} failed enrichment${actionsThisScan !== 1 ? "s" : ""}`,
      });
    }

    // --- Trigger: High-score prospects without outreach ---
    for (const campaign of activeCampaigns) {
      const settings = await ctx.db
        .query("campaignSettings")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
        .first();

      if (!settings || settings.paused) continue;

      const campaignProspects = prospects.filter((p) => p.campaignId === campaign._id);
      const campaignMessages = messages.filter((m) => m.campaignId === campaign._id);

      // Find high-score prospects without any message
      const highScoreNoMessage = campaignProspects.filter(
        (p) =>
          p.donorScore && p.donorScore >= 80 &&
          p.engagementStatus !== "disengaged" &&
          !campaignMessages.some((m) => m.prospectId === p._id),
      );

      if (highScoreNoMessage.length > 0) {
        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: campaign._id,
          type: "agent_recommendation",
          message: `Agent: Found ${highScoreNoMessage.length} high-score prospect${highScoreNoMessage.length !== 1 ? "s" : ""} in "${campaign.name}" without outreach. ${settings.autoSendEnabled ? "Generating messages." : "Enable auto-send to act automatically."}`,
        });

        // If auto-send is on, trigger message generation for these
        if (settings.autoSendEnabled) {
          for (const prospect of highScoreNoMessage.slice(0, 3)) { // max 3 per scan
            await ctx.scheduler.runAfter(0, internal.pipeline.runner.generateMessage, {
              campaignId: campaign._id,
              orgId: args.orgId,
              prospectId: prospect._id,
            });
          }
        }
      }

      // --- Trigger: Stale sent messages (14+ days, no open) → suggest re-send ---
      const staleSent = campaignMessages.filter(
        (m) =>
          m.status === "sent" &&
          !m.openedAt &&
          !m.respondedAt &&
          m.sentAt && now - m.sentAt > fourteenDaysMs,
      );

      if (staleSent.length > 0) {
        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: campaign._id,
          type: "agent_recommendation",
          message: `Agent: ${staleSent.length} email${staleSent.length !== 1 ? "s" : ""} in "${campaign.name}" sent 14+ days ago with no opens. Consider re-sending with a different subject line.`,
        });
      }

      // --- Trigger: Opened but no response (7+ days) → suggest follow-up ---
      const openedNoResponse = campaignMessages.filter(
        (m) =>
          m.status === "sent" &&
          m.openedAt && !m.respondedAt &&
          now - m.openedAt > sevenDaysMs,
      );

      if (openedNoResponse.length > 0) {
        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: campaign._id,
          type: "agent_recommendation",
          message: `Agent: ${openedNoResponse.length} prospect${openedNoResponse.length !== 1 ? "s" : ""} opened emails in "${campaign.name}" but haven't responded after 7 days. Follow-up recommended.`,
        });
      }

      // --- Trigger: Stale drafts (7+ days unreviewed) ---
      const staleDrafts = campaignMessages.filter(
        (m) =>
          m.status === "draft" &&
          m._creationTime && now - m._creationTime > sevenDaysMs,
      );

      if (staleDrafts.length > 0) {
        await ctx.db.insert("activityLog", {
          orgId: args.orgId,
          campaignId: campaign._id,
          type: "agent_recommendation",
          message: `Agent: ${staleDrafts.length} draft message${staleDrafts.length !== 1 ? "s" : ""} in "${campaign.name}" waiting 7+ days for review.`,
        });
      }
    }
  },
});
