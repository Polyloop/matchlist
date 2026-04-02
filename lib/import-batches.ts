import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EnrichmentStage,
  ImportBatch,
  Prospect,
  ProspectList,
} from "@/lib/supabase/types";

const MATCH_READY_STAGES = new Set<EnrichmentStage>([
  "matched",
  "message_generated",
  "sent",
  "failed",
]);

export interface RevealBreakdownEntry {
  name: string;
  prospectCount: number;
  eligibleCount: number;
  estimatedPotential: number;
}

export interface ImportBatchReveal {
  batch: Pick<ImportBatch, "id" | "source_filename" | "created_at" | "updated_at">;
  progress: {
    processedProspectCount: number;
    totalProspectCount: number;
    failedProspectCount: number;
    isReady: boolean;
  };
  headline: {
    estimatedPotential: number;
    eligibleProspectCount: number;
    processedProspectCount: number;
    totalProspectCount: number;
  };
  breakdowns: {
    employer: RevealBreakdownEntry[];
    team: RevealBreakdownEntry[];
    campaign: RevealBreakdownEntry[];
  };
  failures: Array<{
    prospectId: string;
    prospectName: string;
    message: string;
  }>;
}

interface BatchProspect
  extends Pick<
    Prospect,
    | "id"
    | "name"
    | "employer"
    | "employer_match_cap"
    | "match_eligible"
    | "team_list_id"
    | "campaign_list_id"
  > {}

interface BatchJob {
  prospect_id: string;
  stage: EnrichmentStage;
  error_message: string | null;
}

function sortBreakdownEntries(entries: Iterable<RevealBreakdownEntry>) {
  return Array.from(entries).sort((a, b) => {
    if (b.estimatedPotential !== a.estimatedPotential) {
      return b.estimatedPotential - a.estimatedPotential;
    }
    if (b.eligibleCount !== a.eligibleCount) {
      return b.eligibleCount - a.eligibleCount;
    }
    if (b.prospectCount !== a.prospectCount) {
      return b.prospectCount - a.prospectCount;
    }
    return a.name.localeCompare(b.name);
  });
}

function aggregateBreakdown(
  prospects: BatchProspect[],
  getName: (prospect: BatchProspect) => string | null,
) {
  const map = new Map<string, RevealBreakdownEntry>();

  for (const prospect of prospects) {
    const name = getName(prospect)?.trim();
    if (!name) continue;

    const existing = map.get(name) ?? {
      name,
      prospectCount: 0,
      eligibleCount: 0,
      estimatedPotential: 0,
    };

    existing.prospectCount += 1;
    if (prospect.match_eligible) {
      existing.eligibleCount += 1;
      existing.estimatedPotential += prospect.employer_match_cap ?? 0;
    }

    map.set(name, existing);
  }

  return sortBreakdownEntries(map.values());
}

export async function getImportBatchReveal(
  orgId: string,
  batchId: string,
): Promise<ImportBatchReveal | null> {
  const supabase = createAdminClient();

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .select("id, source_filename, created_at, updated_at")
    .eq("id", batchId)
    .eq("org_id", orgId)
    .single();

  if (batchError || !batch) {
    return null;
  }

  const { data: prospects, error: prospectsError } = await supabase
    .from("prospects")
    .select(
      "id, name, employer, employer_match_cap, match_eligible, team_list_id, campaign_list_id",
    )
    .eq("org_id", orgId)
    .eq("import_batch_id", batchId)
    .order("created_at", { ascending: false });

  if (prospectsError) {
    throw new Error(prospectsError.message);
  }

  const prospectRows = (prospects ?? []) as BatchProspect[];
  const prospectIds = prospectRows.map((prospect) => prospect.id);

  let jobsByProspectId = new Map<string, BatchJob>();
  if (prospectIds.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from("enrichment_jobs")
      .select("prospect_id, stage, error_message")
      .eq("org_id", orgId)
      .in("prospect_id", prospectIds);

    if (jobsError) {
      throw new Error(jobsError.message);
    }

    jobsByProspectId = new Map(
      ((jobs ?? []) as BatchJob[]).map((job) => [job.prospect_id, job]),
    );
  }

  const typedListIds = new Set<string>();
  for (const prospect of prospectRows) {
    if (prospect.team_list_id) typedListIds.add(prospect.team_list_id);
    if (prospect.campaign_list_id) typedListIds.add(prospect.campaign_list_id);
  }

  let typedListsById = new Map<string, Pick<ProspectList, "id" | "name" | "type">>();
  if (typedListIds.size > 0) {
    const { data: typedLists, error: typedListsError } = await supabase
      .from("prospect_lists")
      .select("id, name, type")
      .eq("org_id", orgId)
      .in("id", Array.from(typedListIds));

    if (typedListsError) {
      throw new Error(typedListsError.message);
    }

    typedListsById = new Map(
      ((typedLists ?? []) as Array<Pick<ProspectList, "id" | "name" | "type">>).map(
        (list) => [list.id, list],
      ),
    );
  }

  const processedProspectCount = prospectRows.filter((prospect) =>
    MATCH_READY_STAGES.has(
      jobsByProspectId.get(prospect.id)?.stage ?? "pending",
    ),
  ).length;
  const failedProspects = prospectRows
    .map((prospect) => {
      const job = jobsByProspectId.get(prospect.id);
      if (job?.stage !== "failed") return null;
      return {
        prospectId: prospect.id,
        prospectName: prospect.name,
        message: job.error_message || "Unknown processing error",
      };
    })
    .filter((failure): failure is NonNullable<typeof failure> => Boolean(failure));
  const eligibleProspectCount = prospectRows.filter(
    (prospect) => prospect.match_eligible,
  ).length;
  const estimatedPotential = prospectRows.reduce((sum, prospect) => {
    if (!prospect.match_eligible) return sum;
    return sum + (prospect.employer_match_cap ?? 0);
  }, 0);

  return {
    batch,
    progress: {
      processedProspectCount,
      totalProspectCount: prospectRows.length,
      failedProspectCount: failedProspects.length,
      isReady:
        prospectRows.length > 0 && processedProspectCount === prospectRows.length,
    },
    headline: {
      estimatedPotential,
      eligibleProspectCount,
      processedProspectCount,
      totalProspectCount: prospectRows.length,
    },
    breakdowns: {
      employer: aggregateBreakdown(
        prospectRows,
        (prospect) => prospect.employer?.trim() || "Unknown employer",
      ),
      team: aggregateBreakdown(
        prospectRows,
        (prospect) =>
          prospect.team_list_id
            ? typedListsById.get(prospect.team_list_id)?.name ?? null
            : null,
      ),
      campaign: aggregateBreakdown(
        prospectRows,
        (prospect) =>
          prospect.campaign_list_id
            ? typedListsById.get(prospect.campaign_list_id)?.name ?? null
            : null,
      ),
    },
    failures: failedProspects,
  };
}
