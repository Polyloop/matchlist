import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrg } from "../lib/auth";

export const update = mutation({
  args: {
    settings: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    for (const [key, value] of Object.entries(args.settings)) {
      if (!value || value.includes("...")) continue; // Skip masked values

      const existing = await ctx.db
        .query("orgSettings")
        .withIndex("by_org_key", (q) => q.eq("orgId", orgId).eq("key", key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { value });
      } else {
        await ctx.db.insert("orgSettings", { orgId, key, value });
      }
    }
  },
});
