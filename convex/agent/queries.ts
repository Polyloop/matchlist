import { internalQuery } from "../_generated/server";

export const getAllOrgs = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organizations").collect();
  },
});
