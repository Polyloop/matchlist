"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Loading01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  MinusSignIcon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
import { getDisplayValue } from "@/lib/enrichments";
import type { EnrichmentResultStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EnrichmentCellProps {
  enrichmentType: string;
  status: EnrichmentResultStatus | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  onRetry?: () => void;
  onClick?: () => void;
}

export function EnrichmentCell({
  enrichmentType,
  status,
  result,
  errorMessage,
  onRetry,
  onClick,
}: EnrichmentCellProps) {
  // Empty — not run yet
  if (!status) {
    return (
      <span className="text-xs text-muted-foreground/50">
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.5} className="size-3.5" />
      </span>
    );
  }

  // Pending
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
        Queued
      </span>
    );
  }

  // Running
  if (status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-blue-600">
        <HugeiconsIcon icon={Loading01Icon} strokeWidth={1.5} className="size-3.5 animate-spin" />
        Running
      </span>
    );
  }

  // Failed
  if (status === "failed") {
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="size-3.5 text-destructive" />
            <span className="text-xs text-destructive">Failed</span>
            {onRetry && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="ml-0.5"
              >
                <HugeiconsIcon icon={RepeatIcon} strokeWidth={1.5} className="size-3" />
              </Button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{errorMessage || "Enrichment failed"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Success
  const displayValue = getDisplayValue(enrichmentType, result);
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-left text-xs transition-colors",
        onClick && "hover:text-primary cursor-pointer",
      )}
    >
      <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="size-3.5 shrink-0 text-emerald-500" />
      <span className="max-w-[140px] truncate">{displayValue}</span>
    </button>
  );
}
