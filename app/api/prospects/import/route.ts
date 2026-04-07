import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { prospectImportRowSchema } from "@/lib/validations/prospect";
import { triggerPipelineStage } from "@/lib/cronlet/pipeline";

export async function POST(request: Request) {
  try {
    const { orgId } = await requireOrg();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingRaw = formData.get("mapping") as string | null;
    const campaignId = formData.get("campaign_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mapping: Record<string, string> = mappingRaw
      ? JSON.parse(mappingRaw)
      : {};

    const csvText = await file.text();
    const { data: rows, errors: parseErrors } = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseErrors.length > 0) {
      return NextResponse.json(
        { error: "CSV parse errors", details: parseErrors },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const imported: string[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    const typedListCache = new Map<string, string>();

    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        org_id: orgId,
        campaign_id: campaignId,
        source_filename: file.name,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: batchError?.message || "Failed to create import batch" },
        { status: 500 },
      );
    }

    async function resolveTypedListId(
      type: "team" | "campaign",
      rawName: string | undefined,
    ) {
      const name = rawName?.trim();
      if (!name) return null;

      const cacheKey = `${type}:${name}`;
      const cached = typedListCache.get(cacheKey);
      if (cached) return cached;

      const { data: typedList, error: typedListError } = await supabase
        .from("prospect_lists")
        .upsert(
          {
            org_id: orgId,
            name,
            type,
          },
          { onConflict: "org_id,type,name" },
        )
        .select("id")
        .single();

      if (typedListError || !typedList) {
        throw new Error(
          typedListError?.message || `Failed to resolve ${type} list`,
        );
      }

      typedListCache.set(cacheKey, typedList.id);
      return typedList.id;
    }

    for (let i = 0; i < rows.length; i++) {
      try {
        const raw = rows[i];
        // Apply column mapping
        const mapped: Record<string, string> = {};
        for (const [csvCol, fieldName] of Object.entries(mapping)) {
          if (raw[csvCol] !== undefined) {
            mapped[fieldName] = raw[csvCol];
          }
        }
        // If no mapping provided, use raw column names
        const rowData = Object.keys(mapping).length > 0 ? mapped : raw;

        const result = prospectImportRowSchema.safeParse(rowData);
        if (!result.success) {
          errors.push({ row: i + 1, message: result.error.message });
          continue;
        }

        const teamListId = await resolveTypedListId("team", result.data.team);
        const campaignListId = await resolveTypedListId(
          "campaign",
          result.data.campaign,
        );

        // Insert prospect
        const { data: prospect, error: insertError } = await supabase
          .from("prospects")
          .insert({
            org_id: orgId,
            campaign_id: campaignId,
            import_batch_id: batch.id,
            name: result.data.name,
            email: result.data.email ?? null,
            linkedin_url: result.data.linkedin_url ?? null,
            employer: result.data.employer ?? null,
            team_list_id: teamListId,
            campaign_list_id: campaignListId,
          })
          .select("id")
          .single();

        if (insertError || !prospect) {
          errors.push({
            row: i + 1,
            message: insertError?.message || "Insert failed",
          });
          continue;
        }

        // Create enrichment job
        const { error: jobError } = await supabase.from("enrichment_jobs").insert({
          org_id: orgId,
          campaign_id: campaignId,
          prospect_id: prospect.id,
        });

        if (jobError) {
          await supabase
            .from("prospects")
            .delete()
            .eq("id", prospect.id)
            .eq("org_id", orgId);
          errors.push({ row: i + 1, message: jobError.message });
          continue;
        }

        // Kick off enrichment pipeline
        try {
          await triggerPipelineStage("enrich", prospect.id, orgId, {
            flow: "import_reveal",
            stopAfter: "match",
            importBatchId: batch.id,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to start pipeline";

          await supabase
            .from("enrichment_jobs")
            .update({
              stage: "failed",
              error_message: message,
              updated_at: new Date().toISOString(),
            })
            .eq("prospect_id", prospect.id)
            .eq("org_id", orgId);

          errors.push({ row: i + 1, message });
        }

        imported.push(prospect.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown row import error";
        errors.push({ row: i + 1, message });
      }
    }

    return NextResponse.json({
      batchId: batch.id,
      imported: imported.length,
      errors,
      total: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
