import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const checkDuplicates = query({
  args: {
    emails: v.array(v.string()),
    campaignId: v.optional(v.id("campaigns")),
  },
  handler: async (ctx, args) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    const duplicates: Array<{
      email: string;
      existingProspectName: string;
      existingCampaignId: string | null;
      existingCampaignName: string | null;
      sameCampaign: boolean;
    }> = [];

    for (const email of args.emails) {
      if (!email) continue;

      const existing = await ctx.db
        .query("prospects")
        .withIndex("by_org_email", (q) => q.eq("orgId", auth.orgId).eq("email", email))
        .collect();

      for (const prospect of existing) {
        const campaign = prospect.campaignId
          ? await ctx.db.get(prospect.campaignId)
          : null;

        duplicates.push({
          email,
          existingProspectName: prospect.name,
          existingCampaignId: prospect.campaignId ?? null,
          existingCampaignName: campaign?.name ?? null,
          sameCampaign: args.campaignId
            ? prospect.campaignId === args.campaignId
            : false,
        });
      }
    }

    return duplicates;
  },
});
