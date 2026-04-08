"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBeautifyIcon } from "@hugeicons/core-free-icons";

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AgentStatus() {
  const activity = useQuery(api.activity.queries.feed, { limit: 50 });

  if (!activity) return null;

  const agentActions = activity.filter((a) =>
    a.type === "agent_action" || a.type === "agent_recommendation",
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayActions = agentActions.filter((a) => a._creationTime > todayStart.getTime());

  const lastAction = agentActions[0];
  const actions = todayActions.filter((a) => a.type === "agent_action").length;
  const recommendations = todayActions.filter((a) => a.type === "agent_recommendation").length;

  if (todayActions.length === 0 && !lastAction) return null;

  return (
    <Card>
      <CardContent className="!p-3">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600">
            <HugeiconsIcon icon={AiBeautifyIcon} strokeWidth={1.5} className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">Agent</p>
              <span className="flex size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              {lastAction && <p>Last active: {timeAgo(lastAction._creationTime)}</p>}
              {(actions > 0 || recommendations > 0) && (
                <p>
                  Today: {actions > 0 && `${actions} action${actions !== 1 ? "s" : ""}`}
                  {actions > 0 && recommendations > 0 && ", "}
                  {recommendations > 0 && `${recommendations} recommendation${recommendations !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
