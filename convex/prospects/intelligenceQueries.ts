import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { getOrg } from "../lib/auth";

/**
 * Get full context for a prospect — enrichments, messages, timeline.
 * Used by the AI intelligence generator and the prospect detail panel.
 */
export const getProspectFullContext = internalQuery({
  args: {
    prospectId: v.id("prospects"),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const enrichments = await ctx.db
      .query("enrichmentResults")
      .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
      .collect();

    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
      .collect();

    const activity = await ctx.db
      .query("activityLog")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const prospectActivity = activity
      .filter((a) => a.prospectId === args.prospectId)
      .sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0));

    return {
      enrichments: enrichments.map((e) => ({
        type: e.enrichmentType,
        status: e.status,
        result: e.result,
      })),
      messages: messages.map((m) => ({
        subject: m.subject,
        status: m.status,
        sentAt: m.sentAt,
        openedAt: m.openedAt,
        respondedAt: m.respondedAt,
        confidenceScore: m.confidenceScore,
      })),
      timeline: prospectActivity.slice(-20).map((a) => ({
        type: a.type,
        message: a.message,
        time: a._creationTime,
      })),
    };
  },
});

/**
 * Get prospect profile with intelligence data for the UI.
 */
export const getProfile = query({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    const prospect = await ctx.db.get(args.prospectId);
    if (!prospect || prospect.orgId !== auth.orgId) return null;

    // Get enrichment results
    const enrichments = await ctx.db
      .query("enrichmentResults")
      .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
      .collect();

    // Get outreach messages
    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
      .collect();

    // Get activity timeline
    const allActivity = await ctx.db
      .query("activityLog")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const timeline = allActivity
      .filter((a) => a.prospectId === args.prospectId)
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
      .slice(0, 20);

    // Derive signals from data (no AI call needed — instant)
    const signals: string[] = [];
    if (prospect.matchEligible) signals.push("match eligible");
    if (prospect.donorScore && prospect.donorScore >= 80) signals.push("high score");
    if (prospect.donorScore && prospect.donorScore >= 60 && prospect.donorScore < 80) signals.push("medium score");
    if (prospect.employer) signals.push(prospect.employer);

    const sentMessages = messages.filter((m) => m.status === "sent");
    const openedMessages = messages.filter((m) => m.openedAt);
    const respondedMessages = messages.filter((m) => m.respondedAt);

    if (sentMessages.length > 0) signals.push("contacted");
    if (openedMessages.length > 0) signals.push("opened email");
    if (respondedMessages.length > 0) signals.push("responded");

    const hasMatchData = enrichments.some(
      (e) => e.enrichmentType === "match_programme" && e.status === "success",
    );
    const hasWebsiteData = enrichments.some(
      (e) => e.enrichmentType === "website_intelligence" && e.status === "success",
    );
    if (hasWebsiteData) signals.push("website scraped");

    // Determine relationship strength
    let strength: "cold" | "warm" | "engaged" | "active" = "cold";
    if (respondedMessages.length > 0) strength = "active";
    else if (openedMessages.length > 0) strength = "engaged";
    else if (sentMessages.length > 0) strength = "warm";

    // Derive suggested action
    let suggestedAction = "Run enrichment pipeline";
    let suggestedActionReason = "More data needed";
    if (enrichments.length === 0) {
      suggestedAction = "Start pipeline";
      suggestedActionReason = "No enrichment data yet";
    } else if (messages.length === 0) {
      suggestedAction = "Generate outreach message";
      suggestedActionReason = "Enrichment complete, ready for outreach";
    } else if (sentMessages.length > 0 && respondedMessages.length === 0 && openedMessages.length > 0) {
      suggestedAction = "Send follow-up";
      suggestedActionReason = "Opened but hasn't responded";
    } else if (sentMessages.length > 0 && respondedMessages.length === 0) {
      suggestedAction = "Wait or follow up";
      suggestedActionReason = `Sent ${sentMessages.length} message(s), no response yet`;
    } else if (respondedMessages.length > 0) {
      suggestedAction = "Continue conversation";
      suggestedActionReason = "Prospect has responded — keep the momentum";
    } else {
      const drafts = messages.filter((m) => m.status === "draft");
      if (drafts.length > 0) {
        suggestedAction = "Review and approve message";
        suggestedActionReason = `${drafts.length} draft message(s) waiting`;
      }
    }

    return {
      ...prospect,
      signals,
      strength,
      suggestedAction,
      suggestedActionReason,
      enrichments: enrichments.map((e) => ({
        ...e,
        result: e.result as Record<string, unknown> | undefined,
      })),
      messages: messages.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0)),
      timeline,
      stats: {
        totalMessages: messages.length,
        sent: sentMessages.length,
        opened: openedMessages.length,
        responded: respondedMessages.length,
      },
      dataQuality: (() => {
        const missing: string[] = [];
        let fields = 0, filled = 0;
        fields += 2; if (prospect.email) filled += 2; else missing.push("email");
        fields += 2; if (prospect.employer) filled += 2; else missing.push("employer");
        fields += 1; if (prospect.membershipStatus) filled += 1; else missing.push("membership status");
        fields += 1; if (prospect.lastEngagement) filled += 1; else missing.push("last engagement");
        fields += 1; if (prospect.engagementTypes?.length) filled += 1; else missing.push("engagement history");
        fields += 1; if (prospect.donationHistory) filled += 1; else missing.push("donation history");
        fields += 1; if (prospect.notes) filled += 1; else missing.push("notes");
        fields += 1; if (prospect.role) filled += 1; else missing.push("job title");
        return { score: Math.round((filled / fields) * 10), missing };
      })(),
    };
  },
});
