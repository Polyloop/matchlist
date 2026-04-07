"use client";

import { getEnrichmentType } from "@/lib/enrichments";
import type { EnrichmentResultStatus } from "@/lib/supabase/types";

interface EnrichmentColumnHeaderProps {
  enrichmentType: string;
  /** Counts by status for this column */
  statusCounts?: Record<EnrichmentResultStatus, number>;
  totalRows?: number;
}

export function EnrichmentColumnHeader({
  enrichmentType,
  statusCounts,
  totalRows,
}: EnrichmentColumnHeaderProps) {
  const def = getEnrichmentType(enrichmentType);
  const label = def?.label || enrichmentType.replace(/_/g, " ");

  const successCount = statusCounts?.success || 0;
  const hasProgress = totalRows && totalRows > 0 && successCount > 0;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium">{label}</span>
      {hasProgress && (
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.round((successCount / totalRows) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {successCount}/{totalRows}
          </span>
        </div>
      )}
    </div>
  );
}
