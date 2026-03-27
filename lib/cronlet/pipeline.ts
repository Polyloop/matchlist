import { getCronletClient } from "./client";
import type { EnrichmentStage } from "@/lib/supabase/types";

const STAGE_ORDER: EnrichmentStage[] = [
  "enriched",
  "matched",
  "message_generated",
  "sent",
];

const STAGE_TO_ENDPOINT: Record<string, string> = {
  enrich: "/api/pipeline/enrich",
  match: "/api/pipeline/match",
  "generate-message": "/api/pipeline/generate-message",
  send: "/api/pipeline/send",
};

export function getNextStage(
  currentStage: string,
): string | null {
  const stageNames = Object.keys(STAGE_TO_ENDPOINT);
  const currentIndex = stageNames.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= stageNames.length - 1) return null;
  return stageNames[currentIndex + 1];
}

export async function triggerPipelineStage(
  stage: string,
  prospectId: string,
  orgId: string,
) {
  const endpoint = STAGE_TO_ENDPOINT[stage];
  if (!endpoint) throw new Error(`Unknown pipeline stage: ${stage}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const cronlet = getCronletClient();
  const task = await cronlet.tasks.create({
    name: `${stage}:${prospectId}`,
    handler: {
      type: "webhook",
      url: `${appUrl}${endpoint}`,
      method: "POST",
      body: { prospectId, orgId, stage },
    },
    schedule: { type: "once", at: new Date().toISOString() },
    timezone: "UTC",
    timeout: "60s",
    retryAttempts: 2,
    retryBackoff: "linear",
    retryDelay: "5s",
    active: true,
    callbackUrl: `${appUrl}/api/cronlet/callback`,
    metadata: { prospectId, orgId, stage },
  });

  return task;
}
