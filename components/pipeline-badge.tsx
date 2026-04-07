import { Badge } from "@/components/ui/badge";
import type { EnrichmentStage } from "@/lib/types";

const stageConfig: Record<EnrichmentStage, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  scraped: { label: "Scraped", variant: "secondary" },
  enriched: { label: "Enriched", variant: "secondary" },
  matched: { label: "Matched", variant: "default" },
  message_generated: { label: "Message Ready", variant: "default" },
  sent: { label: "Sent", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export function PipelineBadge({ stage }: { stage: EnrichmentStage }) {
  const config = stageConfig[stage] || stageConfig.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
