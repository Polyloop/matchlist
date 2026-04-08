"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon } from "@hugeicons/core-free-icons";

export function ActivityIndicator() {
  const [open, setOpen] = useState(false);
  const entries = useQuery(api.activity.queries.feed, { limit: 5 });

  const recentCount = (entries ?? []).filter(
    (e) => Date.now() - e._creationTime < 60000, // last 60 seconds
  ).length;

  const isActive = recentCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <HugeiconsIcon icon={Activity01Icon} strokeWidth={1.5} className="size-4" />
        {isActive && (
          <span className="absolute -right-0.5 -top-0.5 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
        )}
        <span className="hidden sm:inline">Activity</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="border-b px-3 py-2">
          <h3 className="text-xs font-medium">Recent Activity</h3>
        </div>
        <div className="max-h-[350px] overflow-y-auto p-2">
          <ActivityFeed limit={15} compact />
        </div>
      </PopoverContent>
    </Popover>
  );
}
