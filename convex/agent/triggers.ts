"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * The Agent Brain — runs every 30 minutes.
 * Scans all orgs for actionable moments and either acts autonomously
 * or creates signals for the user.
 */
export const runTriggerScan = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    // Get all orgs
    const orgs = await ctx.runQuery(internal.agent.queries.getAllOrgs);

    for (const org of orgs) {
      try {
        // Run all trigger checks for this org
        await ctx.runMutation(internal.agent.actions.checkAndAct, {
          orgId: org._id,
        });
      } catch (error) {
        // Don't let one org failure stop the scan
        console.error(`Agent scan failed for org ${org._id}:`, error);
      }
    }
  },
});
