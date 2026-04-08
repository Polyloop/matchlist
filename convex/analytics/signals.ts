import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export interface Signal {
  id: string;
  type: "opportunity" | "action_needed" | "insight" | "warning";
  title: string;
  description: string;
  count?: number;
  href?: string;
}

/**
 * Proactive signals — AI-detected opportunities and action items
 * derived from existing data. No AI call needed, pure data analysis.
 */
export const getSignals = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    const signals: Signal[] = [];

    // Get all data
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

    const enrichments = await ctx.db
      .query("enrichmentResults")
      .collect();

    const orgEnrichments = enrichments.filter((e) => e.orgId === auth.orgId);

    // --- Signal: Drafts needing review ---
    const drafts = messages.filter((m) => m.status === "draft");
    if (drafts.length > 0) {
      signals.push({
        id: "drafts_pending",
        type: "action_needed",
        title: `${drafts.length} message${drafts.length !== 1 ? "s" : ""} need your review`,
        description: "AI-generated drafts waiting for approval before sending",
        count: drafts.length,
        href: "/review",
      });
    }

    // --- Signal: Match eligible prospects without messages ---
    const matchEligible = prospects.filter((p) => p.matchEligible);
    const matchEligibleWithoutMessages = matchEligible.filter(
      (p) => !messages.some((m) => m.prospectId === p._id),
    );
    if (matchEligibleWithoutMessages.length > 0) {
      signals.push({
        id: "match_no_outreach",
        type: "opportunity",
        title: `${matchEligibleWithoutMessages.length} match-eligible prospect${matchEligibleWithoutMessages.length !== 1 ? "s" : ""} haven't been contacted`,
        description: "These prospects have employers with matching programmes but no outreach has been sent",
        count: matchEligibleWithoutMessages.length,
      });
    }

    // --- Signal: Emails opened but no response ---
    const openedNoResponse = messages.filter(
      (m) => m.status === "sent" && m.openedAt && !m.respondedAt,
    );
    if (openedNoResponse.length > 0) {
      signals.push({
        id: "opened_no_response",
        type: "opportunity",
        title: `${openedNoResponse.length} email${openedNoResponse.length !== 1 ? "s" : ""} opened but no response`,
        description: "These prospects engaged with your email — a follow-up could convert them",
        count: openedNoResponse.length,
        href: "/review",
      });
    }

    // --- Signal: Sent messages with no opens (7+ days old) ---
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const staleMessages = messages.filter(
      (m) => m.status === "sent" && !m.openedAt && m.sentAt && m.sentAt < sevenDaysAgo,
    );
    if (staleMessages.length > 0) {
      signals.push({
        id: "stale_sends",
        type: "warning",
        title: `${staleMessages.length} email${staleMessages.length !== 1 ? "s" : ""} sent 7+ days ago with no opens`,
        description: "These may have landed in spam or the subject line didn't resonate",
        count: staleMessages.length,
      });
    }

    // --- Signal: Failed enrichments ---
    const failedEnrichments = orgEnrichments.filter((e) => e.status === "failed");
    if (failedEnrichments.length > 0) {
      signals.push({
        id: "failed_enrichments",
        type: "warning",
        title: `${failedEnrichments.length} enrichment${failedEnrichments.length !== 1 ? "s" : ""} failed`,
        description: "Some enrichment steps failed — check API keys or retry",
        count: failedEnrichments.length,
      });
    }

    // --- Signal: High-score prospects ---
    const highScore = prospects.filter((p) => p.donorScore && p.donorScore >= 80);
    if (highScore.length > 0) {
      const unreached = highScore.filter(
        (p) => !messages.some((m) => m.prospectId === p._id && m.status === "sent"),
      );
      if (unreached.length > 0) {
        signals.push({
          id: "high_score_unreached",
          type: "opportunity",
          title: `${unreached.length} high-score prospect${unreached.length !== 1 ? "s" : ""} not yet contacted`,
          description: "These scored 80+ but haven't been sent outreach yet — prioritise them",
          count: unreached.length,
        });
      }
    }

    // --- Signal: Responses received ---
    const responses = messages.filter((m) => m.respondedAt);
    if (responses.length > 0) {
      const recent = responses.filter((m) => m.respondedAt! > Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (recent.length > 0) {
        signals.push({
          id: "recent_responses",
          type: "insight",
          title: `${recent.length} response${recent.length !== 1 ? "s" : ""} this week`,
          description: "Prospects are engaging — check the Review inbox for conversation opportunities",
          count: recent.length,
          href: "/review",
        });
      }
    }

    // --- Signal: Active campaigns with no prospects ---
    const emptyCampaigns = campaigns.filter(
      (c) => c.status === "active" && !prospects.some((p) => p.campaignId === c._id),
    );
    if (emptyCampaigns.length > 0) {
      signals.push({
        id: "empty_campaigns",
        type: "action_needed",
        title: `${emptyCampaigns.length} active campaign${emptyCampaigns.length !== 1 ? "s" : ""} with no prospects`,
        description: "Import a CSV to get started",
        count: emptyCampaigns.length,
        href: "/campaigns",
      });
    }

    // Sort: action_needed first, then opportunity, insight, warning
    const typeOrder = { action_needed: 0, opportunity: 1, insight: 2, warning: 3 };
    return signals.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9));
  },
});
