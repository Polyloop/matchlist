import { mutation } from "../_generated/server";
import { requireOrg } from "../lib/auth";

export const dismiss = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrg(ctx);

    const existing = await ctx.db
      .query("onboardingState")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { dismissed: true });
    } else {
      await ctx.db.insert("onboardingState", {
        orgId,
        dismissed: true,
      });
    }
  },
});
