"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Loading01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import type { Id } from "@/convex/_generated/dataModel";
import "@/lib/enrichments";
import { getEnrichmentType, getDisplayValue } from "@/lib/enrichments";

interface ProspectDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: {
    _id: string;
    name: string;
    email?: string;
    employer?: string;
    matchEligible: boolean;
    donorScore?: number;
  } | null;
  campaignId: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

export function ProspectDetailPanel({
  open,
  onOpenChange,
  prospect,
  campaignId,
}: ProspectDetailPanelProps) {
  const enrichmentResults = useQuery(
    api.campaigns.queries.getEnrichmentResults,
    open && prospect ? { campaignId: campaignId as Id<"campaigns"> } : "skip",
  );

  const messages = useQuery(
    api.outreach.queries.list,
    open && prospect ? { campaignId: campaignId as Id<"campaigns"> } : "skip",
  );

  if (!prospect) return null;

  const prospectResults = (enrichmentResults ?? []).filter(
    (r) => r.prospectId === prospect._id,
  );

  const prospectMessages = (messages ?? []).filter(
    (m) => m.prospectId === prospect._id,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 overflow-y-auto">
        <div className="flex flex-col">
          {/* Header */}
          <div className="border-b p-4">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {getInitials(prospect.name)}
                </span>
                <div>
                  <SheetTitle className="text-base">{prospect.name}</SheetTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    {prospect.email && (
                      <span className="text-xs text-muted-foreground">{prospect.email}</span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-2 mt-3">
              {prospect.employer && (
                <Badge variant="secondary" className="text-xs">{prospect.employer}</Badge>
              )}
              {prospect.matchEligible && (
                <Badge variant="default" className="text-xs">Match Eligible</Badge>
              )}
              {prospect.donorScore != null && (
                <Badge
                  variant="secondary"
                  className={`text-xs ${prospect.donorScore >= 80 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : prospect.donorScore >= 60 ? "border-amber-200 bg-amber-50 text-amber-700" : ""}`}
                >
                  Score: {prospect.donorScore}/100
                </Badge>
              )}
            </div>
          </div>

          <div className="p-4 space-y-6">
              {/* Enrichment results */}
              <div>
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Enrichment Data
                </h3>
                <div className="space-y-2">
                  {prospectResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No enrichment data yet</p>
                  ) : (
                    prospectResults.map((result) => {
                      const def = getEnrichmentType(result.enrichmentType);
                      const label = def?.label || result.enrichmentType.replace(/_/g, " ");

                      return (
                        <div key={result._id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">{label}</span>
                            <StatusIcon status={result.status} />
                          </div>
                          {result.status === "success" && result.result && (
                            <div className="space-y-1">
                              {Object.entries(result.result as Record<string, unknown>).map(([key, value]) => {
                                if (key === "note" && !value) return null;
                                return (
                                  <div key={key} className="flex items-start justify-between gap-3">
                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                      {key.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-[11px] text-right">
                                      {typeof value === "boolean"
                                        ? value ? "Yes" : "No"
                                        : Array.isArray(value)
                                          ? value.join(", ")
                                          : String(value ?? "—")}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {result.status === "failed" && result.errorMessage && (
                            <p className="text-[11px] text-destructive">{result.errorMessage}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Outreach messages */}
              {prospectMessages.length > 0 && (
                <div>
                  <Separator className="mb-4" />
                  <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                    Outreach ({prospectMessages.length})
                  </h3>
                  <div className="space-y-2">
                    {prospectMessages.map((msg) => (
                      <div key={msg._id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">
                            {msg.subject || "No subject"}
                          </span>
                          <Badge
                            variant={
                              msg.status === "sent" ? "default"
                              : msg.status === "approved" ? "secondary"
                              : msg.status === "failed" ? "destructive"
                              : "outline"
                            }
                            className="text-[9px] shrink-0 ml-2"
                          >
                            {msg.respondedAt ? "Responded" : msg.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {msg.content.slice(0, 120)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="size-3.5 text-emerald-500" />;
    case "failed":
      return <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="size-3.5 text-destructive" />;
    case "running":
      return <HugeiconsIcon icon={Loading01Icon} strokeWidth={1.5} className="size-3.5 animate-spin text-blue-500" />;
    case "pending":
      return <span className="size-1.5 rounded-full bg-amber-400" />;
    default:
      return <HugeiconsIcon icon={MinusSignIcon} strokeWidth={1.5} className="size-3.5 text-muted-foreground/40" />;
  }
}
