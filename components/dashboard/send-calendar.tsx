"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface SendCalendarProps {
  campaignId?: Id<"campaigns">;
}

export function SendCalendar({ campaignId }: SendCalendarProps) {
  const schedule = useQuery(api.analytics.queries.sendSchedule, { campaignId });

  if (!schedule || schedule.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No scheduled sends
      </div>
    );
  }

  // Group by day
  const grouped = new Map<string, typeof schedule>();
  for (const step of schedule) {
    const day = new Date(step.scheduledAt).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(step);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([day, steps]) => (
        <div key={day}>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {day}
          </h4>
          <div className="space-y-1">
            {steps.map((step) => {
              const time = new Date(step.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={step._id}
                  className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2"
                >
                  <span className="text-xs tabular-nums text-muted-foreground">{time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{step.prospectName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{step.subject}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      step.status === "scheduled" && "bg-amber-500/10 text-amber-600",
                      step.status === "sent" && "bg-emerald-500/10 text-emerald-600",
                      step.status === "cancelled" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {step.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
