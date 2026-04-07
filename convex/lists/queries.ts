import { query } from "../_generated/server";
import { getOrg } from "../lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOrg(ctx);
    if (!auth) return [];

    const lists = await ctx.db
      .query("prospectLists")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();

    // Get member counts
    const result = await Promise.all(
      lists
        .filter((l) => l.type === "segment")
        .map(async (l) => {
          const members = await ctx.db
            .query("prospectListMembers")
            .withIndex("by_list", (q) => q.eq("listId", l._id))
            .collect();
          return { ...l, prospectCount: members.length };
        }),
    );

    return result;
  },
});
