import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return {};

    const settings = await ctx.db
      .query("orgSettings")
      .withIndex("by_org_key", (q) => q.eq("orgId", auth.orgId))
      .collect();

    const result: Record<string, string> = {};
    for (const s of settings) {
      // Mask API keys - show first 4 and last 4 chars
      if (s.key.includes("API_KEY") && s.value.length > 12) {
        result[s.key] = s.value.slice(0, 4) + "..." + s.value.slice(-4);
      } else {
        result[s.key] = s.value;
      }
    }

    return result;
  },
});
