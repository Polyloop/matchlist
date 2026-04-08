import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const analyse = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    let prospects;
    if (args.campaignId) {
      const cId = args.campaignId;
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_campaign", (q) => q.eq("campaignId", cId))
        .collect();
      prospects = prospects.filter((p) => p.orgId === auth.orgId);
    } else {
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }

    // Get all messages
    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    // Analyse the network
    const total = prospects.length;
    const byMembership: Record<string, number> = {};
    const byEngagementType: Record<string, number> = {};
    const matchEligible: typeof prospects = [];
    const highScore: typeof prospects = [];
    const lapsed: typeof prospects = [];
    const notContacted: typeof prospects = [];

    for (const p of prospects) {
      // Membership breakdown
      const status = p.membershipStatus || "unknown";
      byMembership[status] = (byMembership[status] || 0) + 1;

      // Engagement type breakdown
      for (const t of p.engagementTypes || []) {
        byEngagementType[t] = (byEngagementType[t] || 0) + 1;
      }

      if (p.matchEligible) matchEligible.push(p);
      if (p.donorScore && p.donorScore >= 80) highScore.push(p);
      if (p.membershipStatus === "lapsed" || p.membershipStatus === "former") lapsed.push(p);
      if (!messages.some((m) => m.prospectId === p._id)) notContacted.push(p);
    }

    // Generate recommendations
    const recommendations: Array<{
      prospectName: string;
      prospectId: string;
      reason: string;
      suggestedIntent: string;
      priority: "high" | "medium" | "low";
      employer: string;
      membershipStatus: string;
    }> = [];

    // Priority 1: Lapsed members at matching employers
    for (const p of lapsed) {
      if (p.matchEligible && !messages.some((m) => m.prospectId === p._id)) {
        recommendations.push({
          prospectName: p.name,
          prospectId: p._id,
          reason: `${p.membershipStatus} member since ${p.memberSince || "unknown"}. Employer ${p.employer} matches gifts. ${p.notes || ""}`.trim(),
          suggestedIntent: "reconnect",
          priority: "high",
          employer: p.employer || "",
          membershipStatus: p.membershipStatus || "",
        });
      }
    }

    // Priority 2: High-score prospects not contacted
    for (const p of highScore) {
      if (!messages.some((m) => m.prospectId === p._id) && !recommendations.some((r) => r.prospectId === p._id)) {
        recommendations.push({
          prospectName: p.name,
          prospectId: p._id,
          reason: `Donor score ${p.donorScore}/100. ${p.role ? `${p.role} at ` : ""}${p.employer || "unknown employer"}. ${p.notes || ""}`.trim(),
          suggestedIntent: p.membershipStatus === "lapsed" ? "renew" : "ask",
          priority: "high",
          employer: p.employer || "",
          membershipStatus: p.membershipStatus || "",
        });
      }
    }

    // Priority 3: Former engaged members
    for (const p of prospects) {
      if (recommendations.length >= 8) break;
      if (recommendations.some((r) => r.prospectId === p._id)) continue;
      if (!messages.some((m) => m.prospectId === p._id) && (p.engagementTypes?.length || 0) >= 2) {
        recommendations.push({
          prospectName: p.name,
          prospectId: p._id,
          reason: `Previously engaged as ${(p.engagementTypes || []).join(", ")}. ${p.lastEngagement ? `Last active: ${p.lastEngagement}.` : ""} ${p.notes || ""}`.trim(),
          suggestedIntent: "reconnect",
          priority: "medium",
          employer: p.employer || "",
          membershipStatus: p.membershipStatus || "",
        });
      }
    }

    return {
      total,
      byMembership,
      byEngagementType,
      matchEligibleCount: matchEligible.length,
      highScoreCount: highScore.length,
      lapsedCount: lapsed.length,
      notContactedCount: notContacted.length,
      recommendations: recommendations.slice(0, 8),
    };
  },
});
