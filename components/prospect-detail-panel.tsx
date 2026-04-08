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
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Loading01Icon,
  ArrowRight01Icon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import "@/lib/enrichments";
import { getEnrichmentType } from "@/lib/enrichments";

interface ProspectDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

const strengthConfig: Record<string, { label: string; color: string }> = {
  cold: { label: "Cold", color: "bg-muted text-muted-foreground" },
  warm: { label: "Warm", color: "bg-amber-50 text-amber-700 border-amber-200" },
  engaged: { label: "Engaged", color: "bg-blue-50 text-blue-700 border-blue-200" },
  active: { label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ProspectDetailPanel({ open, onOpenChange, prospectId }: ProspectDetailPanelProps) {
  const profile = useQuery(
    api.prospects.intelligenceQueries.getProfile,
    open && prospectId ? { prospectId: prospectId as Id<"prospects"> } : "skip",
  );

  if (!profile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg p-0 overflow-y-auto">
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            {open ? "Loading..." : "Select a prospect"}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const strength = strengthConfig[profile.strength] || strengthConfig.cold;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 overflow-y-auto">
        {/* Header */}
        <div className="border-b p-5">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {getInitials(profile.name)}
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg">{profile.name}</SheetTitle>
                {profile.email && (
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                )}
              </div>
              <Badge className={cn("shrink-0 text-[10px]", strength.color)}>
                {strength.label}
              </Badge>
            </div>
          </SheetHeader>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.signals.map((signal: string) => (
              <Badge key={signal} variant="secondary" className="text-[10px]">
                {signal}
              </Badge>
            ))}
          </div>
        </div>

        {/* Suggested action */}
        <div className="border-b px-5 py-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={Rocket01Icon} strokeWidth={1.5} className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{profile.suggestedAction}</p>
              <p className="text-[10px] text-muted-foreground">{profile.suggestedActionReason}</p>
            </div>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="size-3.5 text-muted-foreground" />
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Messages" value={profile.stats.totalMessages} />
            <StatBox label="Sent" value={profile.stats.sent} />
            <StatBox label="Opened" value={profile.stats.opened} />
            <StatBox label="Replied" value={profile.stats.responded} />
          </div>

          {profile.donorScore != null && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-xs text-muted-foreground">Donor Score</span>
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                (profile.donorScore as number) >= 80 ? "text-emerald-600" : (profile.donorScore as number) >= 60 ? "text-amber-600" : "text-muted-foreground",
              )}>
                {profile.donorScore}/100
              </span>
            </div>
          )}

          {/* Enrichments */}
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Enrichment Data</h3>
            <div className="space-y-1.5">
              {profile.enrichments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No enrichment data yet</p>
              ) : (
                profile.enrichments.map((e: any) => {
                  const def = getEnrichmentType(e.enrichmentType);
                  const label = def?.label || e.enrichmentType.replace(/_/g, " ");
                  return (
                    <div key={e._id} className="flex items-start gap-2 rounded-md border px-3 py-2">
                      <StatusDot status={e.status} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-medium">{label}</span>
                        {e.status === "success" && e.result && (
                          <div className="mt-0.5 space-y-0.5">
                            {Object.entries(e.result as Record<string, unknown>).slice(0, 3).map(([k, v]) => {
                              if (k === "note" && !v) return null;
                              return (
                                <p key={k} className="text-[10px] text-muted-foreground">
                                  <span className="text-muted-foreground/60">{k.replace(/_/g, " ")}:</span>{" "}
                                  {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "—")}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Messages */}
          {profile.messages.length > 0 && (
            <div>
              <Separator className="mb-4" />
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Outreach ({profile.messages.length})</h3>
              <div className="space-y-1.5">
                {profile.messages.map((msg: any) => (
                  <div key={msg._id} className="rounded-md border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium truncate">{msg.subject || "No subject"}</span>
                      <Badge variant={msg.status === "sent" ? "default" : msg.status === "failed" ? "destructive" : "outline"} className="text-[9px] shrink-0 ml-2">
                        {msg.respondedAt ? "Responded" : msg.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{msg.content.slice(0, 100)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {profile.timeline.length > 0 && (
            <div>
              <Separator className="mb-4" />
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Timeline</h3>
              <div className="space-y-0">
                {profile.timeline.map((entry: any) => (
                  <div key={entry._id} className="flex items-start gap-2 py-1.5">
                    <div className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/30" />
                    <p className="text-[10px] text-muted-foreground flex-1">{entry.message}</p>
                    <span className="text-[9px] tabular-nums text-muted-foreground/50 shrink-0">{timeAgo(entry._creationTime)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-2 py-1.5 text-center">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "success") return <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="size-3 text-emerald-500" />;
  if (status === "failed") return <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="size-3 text-destructive" />;
  if (status === "running") return <HugeiconsIcon icon={Loading01Icon} strokeWidth={1.5} className="size-3 animate-spin text-blue-500" />;
  return <span className="size-1.5 rounded-full bg-amber-400" />;
}
