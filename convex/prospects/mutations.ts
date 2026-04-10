import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { requireOrg } from "../lib/auth";

export const importProspects = mutation({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    filename: v.optional(v.string()),
    rows: v.array(
      v.object({
        name: v.string(),
        email: v.optional(v.string()),
        linkedinUrl: v.optional(v.string()),
        employer: v.optional(v.string()),
        team: v.optional(v.string()),
        campaign: v.optional(v.string()),
        role: v.optional(v.string()),
        membershipStatus: v.optional(v.string()),
        memberSince: v.optional(v.string()),
        lastEngagement: v.optional(v.string()),
        engagementType: v.optional(v.string()),
        donationHistory: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    // Create import batch
    const batchId = await ctx.db.insert("importBatches", {
      orgId,
      campaignId: args.campaignId,
      sourceFilename: args.filename,
    });

    const imported: string[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    // Cache for typed lists
    const listCache = new Map<string, Id<"prospectLists">>();

    async function resolveListId(type: "team" | "campaign", name: string | undefined): Promise<Id<"prospectLists"> | undefined> {
      if (!name?.trim()) return undefined;
      const trimmed = name.trim();
      const cacheKey = `${type}:${trimmed}`;
      const cached = listCache.get(cacheKey);
      if (cached) return cached;

      const existing = await ctx.db
        .query("prospectLists")
        .withIndex("by_org_type_name", (q) =>
          q.eq("orgId", orgId).eq("type", type).eq("name", trimmed),
        )
        .first();

      if (existing) {
        listCache.set(cacheKey, existing._id);
        return existing._id;
      }

      const listId = await ctx.db.insert("prospectLists", {
        orgId,
        name: trimmed,
        type,
      });
      listCache.set(cacheKey, listId);
      return listId;
    }

    for (let i = 0; i < args.rows.length; i++) {
      try {
        const row = args.rows[i];
        if (!row.name?.trim()) {
          errors.push({ row: i + 1, message: "Name is required" });
          continue;
        }

        const teamListId = await resolveListId("team", row.team);
        const campaignListId = await resolveListId("campaign", row.campaign);

        const engagementTypes = row.engagementType
          ? row.engagementType.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined;

        const prospectId = await ctx.db.insert("prospects", {
          orgId,
          campaignId: args.campaignId,
          importBatchId: batchId,
          name: row.name.trim(),
          email: row.email || undefined,
          linkedinUrl: row.linkedinUrl || undefined,
          employer: row.employer || undefined,
          teamListId,
          campaignListId,
          matchEligible: false,
          role: row.role || undefined,
          membershipStatus: row.membershipStatus || undefined,
          memberSince: row.memberSince || undefined,
          lastEngagement: row.lastEngagement || undefined,
          engagementTypes,
          donationHistory: row.donationHistory || undefined,
          notes: row.notes || undefined,
        });

        // Auto-create supporter facts from imported data
        const addFact = async (factType: string, content: string) => {
          await ctx.db.insert("supporterFacts", {
            orgId, prospectId, factType, content, source: "csv_import",
            sourceDate: row.lastEngagement || undefined,
          });
        };
        if (row.membershipStatus) await addFact("membership", `Member status: ${row.membershipStatus}${row.memberSince ? ` since ${row.memberSince}` : ""}`);
        if (row.donationHistory) await addFact("donation", row.donationHistory);
        if (row.notes) await addFact("note", row.notes);
        if (engagementTypes) {
          for (const t of engagementTypes) await addFact("engagement", `Engaged as: ${t}`);
        }
        if (row.employer) await addFact("employment", `${row.role ? `${row.role} at ` : ""}${row.employer}`);

        // Create enrichment job
        await ctx.db.insert("enrichmentJobs", {
          orgId,
          campaignId: args.campaignId,
          prospectId,
          stage: "pending",
        });

        imported.push(prospectId as string);
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Auto-start the pipeline if we have a campaign and prospects
    if (args.campaignId && imported.length > 0) {
      const prospectIds = imported.map((id) => id as unknown as Id<"prospects">);
      await ctx.scheduler.runAfter(0, internal.pipeline.engine.startPipeline, {
        campaignId: args.campaignId,
        orgId,
        prospectIds,
      });
    }

    return { batchId, imported: imported.length, errors, total: args.rows.length };
  },
});

export const reEnrich = mutation({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    const prospect = await ctx.db.get(args.prospectId);
    if (!prospect || prospect.orgId !== orgId) throw new Error("Not found");

    // Reset enrichment job
    const job = await ctx.db
      .query("enrichmentJobs")
      .withIndex("by_org_prospect", (q) =>
        q.eq("orgId", orgId).eq("prospectId", args.prospectId),
      )
      .first();

    if (job) {
      await ctx.db.patch(job._id, { stage: "pending", errorMessage: undefined });
    }
  },
});
