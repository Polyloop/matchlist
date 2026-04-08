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
  Cancel01Icon,
  MinusSignIcon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
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

/**
 * Extract the most meaningful display value from an enrichment result.
 * Shows actual data, not just "success".
 */
function getSmartDisplayValue(type: string, result: Record<string, unknown> | null): { text: string; secondary?: string; color?: string } {
  if (!result) return { text: "—" };

  switch (type) {
    case "employer_lookup":
      return { text: String(result.employer || "—") };

    case "linkedin_profile":
      if (result.profile_url) return { text: String(result.employer || "Linked"), secondary: result.title as string };
      return { text: "No URL" };

    case "match_programme":
      if (result.match_eligible === true) {
        const ratio = result.match_ratio ? `${result.match_ratio}:1` : "";
        const cap = result.match_cap ? `$${Number(result.match_cap).toLocaleString()}` : "";
        return { text: ratio && cap ? `${ratio} up to ${cap}` : "Eligible", color: "text-emerald-600" };
      }
      return { text: "Not eligible", color: "text-muted-foreground" };

    case "website_intelligence": {
      const summary = result.about_summary || result.summary;
      if (summary) {
        const str = String(summary);
        return { text: str.length > 40 ? str.slice(0, 40) + "..." : str };
      }
      return { text: "Scraped" };
    }

    case "donor_score": {
      const score = Number(result.score ?? 0);
      const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-muted-foreground";
      return { text: `${score}/100`, color };
    }

    case "ai_message":
      if (result.message_preview) {
        const str = String(result.message_preview);
        return { text: str.length > 40 ? str.slice(0, 40) + "..." : str };
      }
      if (result.note) return { text: String(result.note).slice(0, 40) };
      return { text: "Generated" };

    case "foundation_lookup":
      return { text: String(result.foundation_name || "—") };

    case "grant_programmes":
      return { text: String(result.programme_name || "—") };

    case "eligibility_check": {
      const score = Number(result.eligibility_score ?? 0);
      return { text: `${Math.round(score * 100)}%`, color: score >= 0.7 ? "text-emerald-600" : "text-muted-foreground" };
    }

    case "company_research":
      return { text: String(result.company_name || "—") };

    case "csr_signals":
      return { text: String(result.csr_budget_estimate || "—") };

    case "contact_enrichment":
      return { text: String(result.contact_name || "No contact") };

    case "volunteer_programme":
      return result.programme_exists ? { text: "Programme found", color: "text-emerald-600" } : { text: "Not found" };

    case "donation_programme":
      return result.programme_exists ? { text: "Programme found", color: "text-emerald-600" } : { text: "Not found" };

    case "coordinator_lookup":
    case "procurement_contact":
      return { text: String(result.contact_name || result.coordinator_name || "No contact") };

    default: {
      // Try to find the first meaningful string value
      const values = Object.entries(result).filter(([k, v]) => k !== "note" && v != null && v !== "");
      if (values.length > 0) {
        const str = String(values[0][1]);
        return { text: str.length > 40 ? str.slice(0, 40) + "..." : str };
      }
      return { text: "Done" };
    }
  }
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
      <span className="text-[11px] text-muted-foreground/40">
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.5} className="size-3.5" />
      </span>
    );
  }

  // Pending
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
        Queued
      </span>
    );
  }

  // Running
  if (status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-blue-600">
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
            <span className="text-[11px] text-destructive">Failed</span>
            {onRetry && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                className="ml-0.5"
              >
                <HugeiconsIcon icon={RepeatIcon} strokeWidth={1.5} className="size-3" />
              </Button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-[11px]">{errorMessage || "Enrichment failed"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Success — show actual data
  const display = getSmartDisplayValue(enrichmentType, result);
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start text-left text-[11px] transition-colors max-w-[160px]",
        onClick && "hover:text-primary",
        display.color || "text-foreground",
      )}
    >
      <span className="truncate w-full">{display.text}</span>
      {display.secondary && (
        <span className="truncate w-full text-[10px] text-muted-foreground">{display.secondary}</span>
      )}
    </button>
  );
}
