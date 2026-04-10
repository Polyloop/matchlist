"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Pull contacts from Salesforce NPSP into Scout as prospects.
 */
export const pullContacts = internalAction({
  args: {
    connectionId: v.id("crmConnections"),
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.crm.queries.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection || !connection.accessToken) return;

    try {
      // Query Salesforce contacts
      const query = encodeURIComponent(
        "SELECT Id, FirstName, LastName, Email, Title, Account.Name, npe01__HomeEmail__c FROM Contact WHERE Email != null ORDER BY LastModifiedDate DESC LIMIT 200"
      );

      const response = await fetch(
        `${connection.instanceUrl}/services/data/v59.0/query?q=${query}`,
        {
          headers: {
            "Authorization": `Bearer ${connection.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 401) {
        // Token expired — try refresh
        await ctx.runMutation(internal.crm.mutations.markSyncFailed, {
          connectionId: args.connectionId,
          error: "Token expired — reconnect required",
        });
        return;
      }

      if (!response.ok) {
        await ctx.runMutation(internal.crm.mutations.markSyncFailed, {
          connectionId: args.connectionId,
          error: `Salesforce API error: ${response.status}`,
        });
        return;
      }

      const data = await response.json();
      const records = data.records || [];

      let imported = 0;
      for (const record of records) {
        const email = record.Email || record.npe01__HomeEmail__c;
        if (!email) continue;

        const name = [record.FirstName, record.LastName].filter(Boolean).join(" ");
        if (!name) continue;

        await ctx.runMutation(internal.crm.mutations.upsertProspectFromCrm, {
          orgId: args.orgId,
          campaignId: args.campaignId,
          name,
          email,
          employer: record.Account?.Name || undefined,
          crmId: record.Id,
          crmProvider: "salesforce",
        });
        imported++;
      }

      await ctx.runMutation(internal.crm.mutations.markSyncComplete, {
        connectionId: args.connectionId,
        count: imported,
      });

      await ctx.runMutation(internal.activity.mutations.log, {
        orgId: args.orgId,
        campaignId: args.campaignId,
        type: "crm_sync_complete",
        message: `Salesforce sync: imported ${imported} contacts`,
      });
    } catch (error) {
      await ctx.runMutation(internal.crm.mutations.markSyncFailed, {
        connectionId: args.connectionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Push an outreach activity to Salesforce as a Task.
 */
export const pushActivity = internalAction({
  args: {
    connectionId: v.id("crmConnections"),
    prospectEmail: v.string(),
    subject: v.string(),
    description: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.crm.queries.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection || !connection.accessToken) return;

    try {
      // Find the contact by email
      const query = encodeURIComponent(
        `SELECT Id FROM Contact WHERE Email = '${args.prospectEmail}' LIMIT 1`
      );

      const searchRes = await fetch(
        `${connection.instanceUrl}/services/data/v59.0/query?q=${query}`,
        {
          headers: { "Authorization": `Bearer ${connection.accessToken}` },
        },
      );

      if (!searchRes.ok) return;
      const searchData = await searchRes.json();
      const contactId = searchData.records?.[0]?.Id;
      if (!contactId) return;

      // Create a Task
      await fetch(
        `${connection.instanceUrl}/services/data/v59.0/sobjects/Task`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${connection.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            WhoId: contactId,
            Subject: args.subject,
            Description: args.description,
            Status: args.status === "sent" ? "Completed" : "Open",
            ActivityDate: new Date().toISOString().split("T")[0],
            Type: "Email",
          }),
        },
      );
    } catch {
      // Silently fail push — don't break the main flow
    }
  },
});
