"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useState, useMemo } from "react";

export interface MessageListItem {
  _id: string;
  prospectName: string;
  prospectEmail: string | null;
  subject: string | null;
  content: string;
  status: string;
  confidenceScore: number | null;
  campaignName: string | null;
  respondedAt?: number | null;
  _creationTime: number;
}

interface MessageListProps {
  messages: MessageListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function statusBadge(status: string) {
  switch (status) {
    case "draft": return { label: "Draft", variant: "outline" as const, className: "" };
    case "approved": return { label: "Approved", variant: "secondary" as const, className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" };
    case "sent": return { label: "Sent", variant: "default" as const, className: "" };
    case "responded": return { label: "Responded", variant: "secondary" as const, className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400" };
    case "failed": return { label: "Failed", variant: "destructive" as const, className: "" };
    default: return { label: status, variant: "outline" as const, className: "" };
  }
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MessageList({ messages, selectedId, onSelect }: MessageListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = messages;
    if (statusFilter === "responded") {
      result = result.filter((m) => m.respondedAt);
    } else if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter && !m.respondedAt);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.prospectName.toLowerCase().includes(q) ||
          m.subject?.toLowerCase().includes(q) ||
          m.campaignName?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [messages, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: messages.length, responded: 0 };
    for (const m of messages) {
      if (m.respondedAt) { c.responded++; }
      else { c[m.status] = (c[m.status] || 0) + 1; }
    }
    return c;
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="border-b px-3 py-2">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="h-7">
            {[
              { value: "all", label: "All" },
              { value: "draft", label: "Draft" },
              { value: "approved", label: "Ready" },
              { value: "sent", label: "Sent" },
              { value: "responded", label: "Replied" },
            ].map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-[10px] px-2 h-6">
                {tab.label}
                {(counts[tab.value] ?? 0) > 0 && (
                  <span className="ml-1 text-[9px] text-muted-foreground">{counts[tab.value]}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            No messages
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((msg) => {
              const effectiveStatus = msg.respondedAt ? "responded" : msg.status;
              const badge = statusBadge(effectiveStatus);
              const isSelected = selectedId === msg._id;
              return (
                <button
                  key={msg._id}
                  onClick={() => onSelect(msg._id)}
                  className={cn(
                    "flex w-full items-start gap-3 p-3 text-left transition-colors",
                    isSelected ? "bg-muted/60" : "hover:bg-muted/30",
                    msg.status === "approved" && "border-l-2 border-l-emerald-500",
                    msg.status === "sent" && "border-l-2 border-l-primary",
                    msg.status === "failed" && "border-l-2 border-l-destructive",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                    {getInitials(msg.prospectName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium">{msg.prospectName}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {timeAgo(msg._creationTime)}
                      </span>
                    </div>
                    <p className="truncate text-[11px] font-medium text-muted-foreground">
                      {msg.subject || "No subject"}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
                      {msg.content.slice(0, 80)}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant={badge.variant} className={cn("h-4 px-1 text-[9px]", badge.className)}>
                        {badge.label}
                      </Badge>
                      {msg.campaignName && (
                        <span className="truncate text-[9px] text-muted-foreground/50">
                          {msg.campaignName}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
