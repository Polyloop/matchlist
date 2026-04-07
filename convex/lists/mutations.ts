import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireOrg } from "../lib/auth";

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    // Check for duplicate
    const existing = await ctx.db
      .query("prospectLists")
      .withIndex("by_org_type_name", (q) =>
        q.eq("orgId", orgId).eq("type", "segment").eq("name", args.name.trim()),
      )
      .first();

    if (existing) throw new Error("A list with that name already exists");

    return await ctx.db.insert("prospectLists", {
      orgId,
      name: args.name.trim(),
      type: "segment",
    });
  },
});

export const addMembers = mutation({
  args: {
    listId: v.id("prospectLists"),
    prospectIds: v.array(v.id("prospects")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    const list = await ctx.db.get(args.listId);
    if (!list || list.orgId !== orgId) throw new Error("List not found");

    let added = 0;
    for (const prospectId of args.prospectIds) {
      // Check if already a member
      const existing = await ctx.db
        .query("prospectListMembers")
        .withIndex("by_prospect", (q) => q.eq("prospectId", prospectId))
        .filter((q) => q.eq(q.field("listId"), args.listId))
        .first();

      if (!existing) {
        await ctx.db.insert("prospectListMembers", {
          prospectId,
          listId: args.listId,
        });
        added++;
      }
    }

    return { added };
  },
});
