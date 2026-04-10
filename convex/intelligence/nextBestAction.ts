import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

interface ScoredAction {
  prospectId: string;
  prospectName: string;
  employer: string;
  membershipStatus: string;
  priority: number;
  recommendedAction: string;
  whyNow: string;
  actionReason: string;
  dataQuality: number;
  missingFields: string[];
}

function calculateDataQuality(p: any): { score: number; missing: string[] } {
  const missing: string[] = [];
  let fields = 0;
  let filled = 0;

  // Core fields (weighted higher)
  fields += 2; if (p.email) filled += 2; else missing.push("email");
  fields += 2; if (p.employer) filled += 2; else missing.push("employer");

  // Relationship fields
  fields += 1; if (p.membershipStatus) filled += 1; else missing.push("membership status");
  fields += 1; if (p.lastEngagement) filled += 1; else missing.push("last engagement date");
  fields += 1; if (p.engagementTypes?.length) filled += 1; else missing.push("engagement history");
  fields += 1; if (p.donationHistory) filled += 1; else missing.push("donation history");
  fields += 1; if (p.notes) filled += 1; else missing.push("relationship notes");
  fields += 1; if (p.role) filled += 1; else missing.push("job title");

  return { score: Math.round((filled / fields) * 10), missing };
}

/**
 * Score all supporters and return ranked next-best-actions.
 * This is the core intelligence engine.
 */
export const getNextBestActions = query({
  args: {
    limit: v.optional(v.number()),
    campaignId: v.optional(v.id("campaigns")),
    actionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    // Get all prospects
    let prospects;
    if (args.campaignId) {
      const cId = args.campaignId;
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_campaign", (q) => q.eq("campaignId", cId))
        .collect();
    } else {
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }
    prospects = prospects.filter((p) => p.orgId === auth.orgId && p.engagementStatus !== "disengaged");

    // Get all messages for context
    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const scored: ScoredAction[] = [];

    for (const p of prospects) {
      const prospectMessages = messages.filter((m) => m.prospectId === p._id);
      const sentMessages = prospectMessages.filter((m) => m.status === "sent");
      const openedMessages = prospectMessages.filter((m) => m.openedAt);
      const respondedMessages = prospectMessages.filter((m) => m.respondedAt);
      const draftMessages = prospectMessages.filter((m) => m.status === "draft");

      // --- SCORING ---
      let score = 0;
      const reasons: string[] = [];

      // Recency decay (0-20): how long since last engagement?
      if (p.lastEngagement) {
        const lastDate = new Date(p.lastEngagement).getTime();
        const daysSince = (now - lastDate) / dayMs;
        if (daysSince < 30) { score += 5; }
        else if (daysSince < 90) { score += 10; }
        else if (daysSince < 365) { score += 15; reasons.push(`Last engaged ${Math.round(daysSince / 30)} months ago`); }
        else { score += 20; reasons.push(`Last engaged ${Math.round(daysSince / 365)} years ago — dormant`); }
      } else if (prospectMessages.length === 0) {
        score += 15; // Never contacted = opportunity
        reasons.push("Never been contacted");
      }

      // Affinity signal (0-20): how deeply have they engaged?
      const types = p.engagementTypes || [];
      if (types.includes("board_member")) { score += 20; reasons.push("Former board member"); }
      else if (types.includes("donor")) { score += 15; if (p.donationHistory) reasons.push(`Donor: ${p.donationHistory}`); }
      else if (types.includes("volunteer")) { score += 12; reasons.push("Previous volunteer"); }
      else if (types.includes("mentor") || types.includes("alumnus")) { score += 10; reasons.push(`${types.includes("mentor") ? "Mentor" : "Alumnus"}`); }
      else if (types.includes("member")) { score += 8; }
      else if (types.includes("event_attendee")) { score += 5; }

      // Opportunity signal (0-20): match eligible? membership lapsing?
      if (p.matchEligible) { score += 15; reasons.push(`${p.employer} matches donations`); }
      if (p.membershipStatus === "lapsed") { score += 15; reasons.push("Membership lapsed"); }
      else if (p.membershipStatus === "former") { score += 10; reasons.push("Former member"); }

      // Response history (0-20): engaged with outreach?
      if (respondedMessages.length > 0) { score += 20; reasons.push("Previously responded to outreach"); }
      else if (openedMessages.length > 0) { score += 12; reasons.push("Opened previous emails"); }
      else if (sentMessages.length > 0 && openedMessages.length === 0) {
        const lastSent = Math.max(...sentMessages.map((m) => m.sentAt || 0));
        if (now - lastSent > 14 * dayMs) { score += 5; reasons.push("Sent email 14+ days ago, no opens"); }
      }

      // Gap signal (0-20): high-value but no recent outreach?
      if ((p.donorScore || 0) >= 80 && sentMessages.length === 0) {
        score += 20; reasons.push("High donor score but no outreach yet");
      } else if ((p.donorScore || 0) >= 60 && sentMessages.length === 0) {
        score += 10;
      }

      // --- ACTION DETERMINATION ---
      let action = "reconnect";
      let actionReason = "";

      if (respondedMessages.length > 0 && draftMessages.length > 0) {
        action = "steward";
        actionReason = "They responded — follow up to deepen the relationship";
      } else if (p.membershipStatus === "lapsed") {
        action = "renew";
        actionReason = "Their membership lapsed — a warm renewal invitation could bring them back";
      } else if (p.matchEligible && sentMessages.length === 0) {
        action = "ask_match";
        actionReason = `${p.employer} matches donations — inform them about this opportunity`;
      } else if (types.length >= 2 && sentMessages.length === 0) {
        action = "reconnect";
        actionReason = "Deeply engaged in the past but lost touch — reconnect before asking";
      } else if (types.includes("event_attendee") && !types.includes("member")) {
        action = "invite";
        actionReason = "Attended events but never joined — invite to a membership pathway";
      } else if (types.includes("donor") && p.matchEligible) {
        action = "ask_match";
        actionReason = "Existing donor whose employer matches — could double their impact";
      } else if (sentMessages.length > 0 && openedMessages.length > 0 && respondedMessages.length === 0) {
        action = "share_value";
        actionReason = "They opened your email but didn't respond — share something valuable before another ask";
      } else if (sentMessages.length === 0) {
        action = "reconnect";
        actionReason = "Haven't been contacted yet — start with a warm reconnection";
      }

      // Filter by action type if specified
      if (args.actionType && action !== args.actionType) continue;

      // Build whyNow sentence
      const whyParts: string[] = [];
      if (p.role) whyParts.push(`${p.role} at ${p.employer || "unknown"}`);
      else if (p.employer) whyParts.push(`At ${p.employer}`);
      if (p.membershipStatus && p.membershipStatus !== "never") {
        whyParts.push(`${p.membershipStatus} member${p.memberSince ? ` since ${p.memberSince}` : ""}`);
      }
      whyParts.push(...reasons.slice(0, 2));
      if (p.notes) whyParts.push(p.notes.slice(0, 80));

      const whyNow = `${p.name}: ${whyParts.join(". ")}.`;

      const quality = calculateDataQuality(p);

      scored.push({
        prospectId: p._id,
        prospectName: p.name,
        employer: p.employer || "",
        membershipStatus: p.membershipStatus || "unknown",
        priority: Math.min(100, score),
        recommendedAction: action,
        whyNow,
        actionReason,
        dataQuality: quality.score,
        missingFields: quality.missing,
      });
    }

    // Sort by priority descending
    scored.sort((a, b) => b.priority - a.priority);

    // Calculate network-wide data quality summary
    const avgQuality = scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.dataQuality, 0) / scored.length)
      : 0;

    const commonMissing: Record<string, number> = {};
    for (const s of scored) {
      for (const f of s.missingFields) {
        commonMissing[f] = (commonMissing[f] || 0) + 1;
      }
    }
    const topMissing = Object.entries(commonMissing)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([field, count]) => `${field} (${count}/${scored.length} missing)`);

    return {
      actions: scored.slice(0, args.limit || 10),
      networkSummary: {
        totalSuporters: prospects.length,
        scoredCount: scored.length,
        avgDataQuality: avgQuality,
        topMissingFields: topMissing,
        dataQualityNote: avgQuality >= 7
          ? "Good data — recommendations are high confidence"
          : avgQuality >= 4
            ? "Moderate data — recommendations are reasonable but could improve with more context"
            : "Sparse data — adding membership status, engagement history, and notes would significantly improve recommendations",
      },
    };
  },
});

/**
 * Get time-sensitive relationship moments.
 */
export const getRelationshipMoments = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return { lapsing: [], staleOutreach: [], openResponses: [], pendingFollowUps: [] };

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Lapsing memberships (within 30/60/90 days based on lastEngagement)
    const lapsing = prospects
      .filter((p) => p.membershipStatus === "active" && p.lastEngagement)
      .filter((p) => {
        const daysSince = (now - new Date(p.lastEngagement!).getTime()) / dayMs;
        return daysSince > 270; // 9+ months without engagement = at risk
      })
      .map((p) => ({ name: p.name, employer: p.employer, daysSinceEngagement: Math.round((now - new Date(p.lastEngagement!).getTime()) / dayMs) }));

    // Stale outreach (sent 14+ days, no open)
    const staleOutreach = messages
      .filter((m) => m.status === "sent" && !m.openedAt && m.sentAt && now - m.sentAt > 14 * dayMs)
      .slice(0, 5)
      .map((m) => {
        const p = prospects.find((pr) => pr._id === m.prospectId);
        return { prospectName: p?.name || "Unknown", subject: m.subject, daysSinceSent: Math.round((now - (m.sentAt || 0)) / dayMs) };
      });

    // Open responses (responded but no follow-up draft)
    const openResponses = messages
      .filter((m) => m.respondedAt && !messages.some((fm) => fm.replyTo === m._id))
      .slice(0, 5)
      .map((m) => {
        const p = prospects.find((pr) => pr._id === m.prospectId);
        return { prospectName: p?.name || "Unknown", respondedDaysAgo: Math.round((now - (m.respondedAt || 0)) / dayMs) };
      });

    return { lapsing, staleOutreach, openResponses, pendingFollowUps: [] };
  },
});
