"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const typeStyles: Record<string, { dot: string; text: string }> = {
  pipeline_started: { dot: "bg-blue-500", text: "text-foreground" },
  enrichment_complete: { dot: "bg-emerald-500", text: "text-foreground" },
  enrichment_failed: { dot: "bg-red-500", text: "text-destructive" },
  message_generated: { dot: "bg-violet-500", text: "text-foreground" },
  message_sent: { dot: "bg-emerald-500", text: "text-foreground" },
  send_scheduled: { dot: "bg-amber-500", text: "text-foreground" },
  send_failed: { dot: "bg-red-500", text: "text-destructive" },
  follow_up_scheduled: { dot: "bg-blue-400", text: "text-foreground" },
  message_skipped: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  schedule_failed: { dot: "bg-red-400", text: "text-muted-foreground" },
};

interface ActivityFeedProps {
  campaignId?: Id<"campaigns">;
  limit?: number;
  compact?: boolean;
}

export function ActivityFeed({ campaignId, limit = 30, compact = false }: ActivityFeedProps) {
  const entries = useQuery(api.activity.queries.feed, {
    campaignId,
    limit,
  });

  if (!entries || entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry) => {
        const style = typeStyles[entry.type] || { dot: "bg-muted-foreground", text: "text-foreground" };
        const time = new Date(entry._creationTime);
        const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateStr = time.toLocaleDateString([], { month: "short", day: "numeric" });

        return (
          <div
            key={entry._id}
            className={cn(
              "group flex items-start gap-3 border-b border-border/40 py-2.5 last:border-0",
              compact && "py-2",
            )}
          >
            <div className="flex flex-col items-center pt-1.5">
              <div className={cn("size-1.5 rounded-full", style.dot)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs leading-relaxed", style.text)}>
                {entry.message}
              </p>
            </div>
            <span className="shrink-0 pt-0.5 text-[10px] tabular-nums text-muted-foreground/60">
              {dateStr} {timeStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}
