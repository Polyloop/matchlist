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

    for (let i = 0; i < rows.length; i++) {
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

      // Insert prospect
      const { data: prospect, error: insertError } = await supabase
        .from("prospects")
        .insert({
          org_id: orgId,
          name: result.data.name,
          email: result.data.email ?? null,
          linkedin_url: result.data.linkedin_url ?? null,
          employer: result.data.employer ?? null,
        })
        .select("id")
        .single();

      if (insertError || !prospect) {
        errors.push({ row: i + 1, message: insertError?.message || "Insert failed" });
        continue;
      }

      // Create enrichment job
      await supabase.from("enrichment_jobs").insert({
        org_id: orgId,
        prospect_id: prospect.id,
      });

      // Kick off enrichment pipeline
      await triggerPipelineStage("enrich", prospect.id, orgId);
      imported.push(prospect.id);
    }

    return NextResponse.json({
      imported: imported.length,
      errors,
      total: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
