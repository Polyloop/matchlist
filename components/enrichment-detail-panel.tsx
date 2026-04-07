"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEnrichmentType } from "@/lib/enrichments";
import type { EnrichmentResult } from "@/lib/supabase/types";

interface EnrichmentDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: EnrichmentResult | null;
  prospectName?: string;
  onRetry?: (resultId: string) => void;
}

function statusVariant(status: string) {
  switch (status) {
    case "success": return "default" as const;
    case "running": return "secondary" as const;
    case "pending": return "outline" as const;
    case "failed": return "destructive" as const;
    default: return "outline" as const;
  }
}

export function EnrichmentDetailPanel({
  open,
  onOpenChange,
  result,
  prospectName,
  onRetry,
}: EnrichmentDetailPanelProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (!result) return null;

  const def = getEnrichmentType(result.enrichment_type);
  const label = def?.label || result.enrichment_type;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>
            {prospectName && <span>For {prospectName} &middot; </span>}
            <Badge variant={statusVariant(result.status)} className="mt-1">
              {result.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {result.error_message && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{result.error_message}</p>
            </div>
          )}

          {result.result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Result Data</h4>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowRaw(!showRaw)}
                >
                  {showRaw ? "Formatted" : "Raw JSON"}
                </Button>
              </div>

              {showRaw ? (
                <pre className="overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              ) : (
                <div className="space-y-2">
                  {Object.entries(result.result).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-4 border-b pb-2 last:border-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-right text-xs">
                        {typeof value === "boolean"
                          ? value ? "Yes" : "No"
                          : String(value ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(result.updated_at).toLocaleString()}
          </div>

          {result.status === "failed" && onRetry && (
            <Button onClick={() => onRetry(result.id)} className="w-full">
              Retry Enrichment
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
