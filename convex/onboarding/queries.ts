import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
  cta: string;
}

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return null;

    // Check if dismissed
    const state = await ctx.db
      .query("onboardingState")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .first();

    if (state?.dismissed) return { steps: [], allComplete: true, dismissed: true, completedSteps: 0, totalSteps: 0 };

    // Derive step completion from real data
    const settings = await ctx.db
      .query("orgSettings")
      .withIndex("by_org_key", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const hasProfile = !!(settingsMap.get("ORG_NAME") && settingsMap.get("SENDER_NAME"));
    const hasAiKey = !!settingsMap.get("ANTHROPIC_API_KEY");

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();
    const hasCampaign = campaigns.length > 0;

    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .first();
    const hasProspects = !!prospects;

    const messages = await ctx.db
      .query("outreachMessages")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .first();
    const hasMessages = !!messages;

    const steps: OnboardingStep[] = [
      {
        id: "profile",
        label: "Set up your profile",
        description: "Add your organisation name and sender identity",
        complete: hasProfile,
        href: "/settings",
        cta: "Open Settings",
      },
      {
        id: "ai_key",
        label: "Connect your AI",
        description: "Add your Anthropic API key to enable AI-powered outreach",
        complete: hasAiKey,
        href: "/settings",
        cta: "Add API Key",
      },
      {
        id: "campaign",
        label: "Create your first campaign",
        description: "Pick a template or start from scratch",
        complete: hasCampaign,
        href: "/campaigns/new",
        cta: "Create Campaign",
      },
      {
        id: "prospects",
        label: "Import prospects",
        description: "Upload a CSV with names, emails, and employers",
        complete: hasProspects,
        href: hasCampaign ? `/campaigns/${campaigns[0]?._id}/import` : "/campaigns/new",
        cta: "Import CSV",
      },
      {
        id: "magic",
        label: "Watch the magic",
        description: "See AI-generated personalised emails in your Review inbox",
        complete: hasMessages,
        href: "/review",
        cta: "Open Review",
      },
    ];

    const completedSteps = steps.filter((s) => s.complete).length;

    return {
      steps,
      allComplete: completedSteps === steps.length,
      dismissed: false,
      completedSteps,
      totalSteps: steps.length,
    };
  },
});
