import { getCronletClient } from "./client";

const STAGE_TO_ENDPOINT: Record<string, string> = {
  enrich: "/api/pipeline/enrich",
  match: "/api/pipeline/match",
  "generate-message": "/api/pipeline/generate-message",
  send: "/api/pipeline/send",
};

export type PipelineStage = keyof typeof STAGE_TO_ENDPOINT;
export type PipelineFlow = "import_reveal" | "outreach_resume";
export type PipelineStopAfter = "match" | "send";

export interface PipelineTriggerOptions {
  flow?: PipelineFlow;
  stopAfter?: PipelineStopAfter;
  importBatchId?: string | null;
}

export function getNextStage(
  currentStage: PipelineStage,
  stopAfter: PipelineStopAfter = "send",
): PipelineStage | null {
  const stageNames = Object.keys(STAGE_TO_ENDPOINT) as PipelineStage[];
  const currentIndex = stageNames.indexOf(currentStage);
  if (currentIndex === -1) return null;

  if (currentStage === stopAfter) {
    return null;
  }

  if (currentIndex >= stageNames.length - 1) return null;
  return stageNames[currentIndex + 1];
}

export async function triggerPipelineStage(
  stage: PipelineStage,
  prospectId: string,
  orgId: string,
  options: PipelineTriggerOptions = {},
) {
  const endpoint = STAGE_TO_ENDPOINT[stage];
  if (!endpoint) throw new Error(`Unknown pipeline stage: ${stage}`);

  const flow = options.flow ?? "outreach_resume";
  const stopAfter = options.stopAfter ?? "send";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const cronlet = getCronletClient();
  const task = await cronlet.tasks.create({
    name: `${stage}:${flow}:${prospectId}`,
    handler: {
      type: "webhook",
      url: `${appUrl}${endpoint}`,
      method: "POST",
      body: {
        prospectId,
        orgId,
        stage,
        flow,
        stopAfter,
        importBatchId: options.importBatchId ?? null,
      },
    },
    schedule: { type: "once", at: new Date().toISOString() },
    timezone: "UTC",
    timeout: "60s",
    retryAttempts: 2,
    retryBackoff: "linear",
    retryDelay: "5s",
    active: true,
    callbackUrl: `${appUrl}/api/cronlet/callback`,
    metadata: {
      prospectId,
      orgId,
      stage,
      flow,
      stopAfter,
      importBatchId: options.importBatchId ?? null,
    },
  });

  return task;
}
