"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageList, type MessageListItem } from "@/components/review/message-list";
import { MessageDetail } from "@/components/review/message-detail";
import { HugeiconsIcon } from "@hugeicons/react";
import { MailSend01Icon } from "@hugeicons/core-free-icons";
import type { Id } from "@/convex/_generated/dataModel";

export default function ReviewPage() {
  const rawMessages = useQuery(api.outreach.queries.list, {});
  const loading = rawMessages === undefined;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const messages: MessageListItem[] = useMemo(() => {
    return (rawMessages ?? []).map((m) => ({
      _id: m._id,
      prospectName: m.prospectName,
      prospectEmail: m.prospectEmail ?? null,
      subject: m.subject ?? null,
      content: m.content,
      status: m.status,
      confidenceScore: m.confidenceScore ?? null,
      campaignName: m.campaignName ?? null,
      respondedAt: m.respondedAt ?? null,
      _creationTime: m._creationTime,
    }));
  }, [rawMessages]);

  const selectedMessage = useMemo(() => {
    if (!selectedId) return null;
    const raw = (rawMessages ?? []).find((m) => m._id === selectedId);
    if (!raw) return null;
    return {
      _id: raw._id as Id<"outreachMessages">,
      prospectName: raw.prospectName,
      prospectEmail: raw.prospectEmail ?? null,
      subject: raw.subject ?? null,
      content: raw.content,
      status: raw.status,
      confidenceScore: raw.confidenceScore ?? null,
      campaignName: raw.campaignName ?? null,
      campaignType: raw.campaignType ?? null,
      respondedAt: raw.respondedAt ?? null,
      sentAt: raw.sentAt,
      _creationTime: raw._creationTime,
    };
  }, [selectedId, rawMessages]);

  // Auto-select first message if none selected
  if (!selectedId && messages.length > 0) {
    // Use a timeout to avoid setting state during render
    setTimeout(() => setSelectedId(messages[0]._id), 0);
  }

  // If selected message was deleted, clear selection
  if (selectedId && !messages.find((m) => m._id === selectedId)) {
    setTimeout(() => setSelectedId(messages[0]?._id ?? null), 0);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <div className="flex gap-4">
          <Skeleton className="h-[600px] w-[350px]" />
          <Skeleton className="h-[600px] flex-1" />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={MailSend01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">No messages to review</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Messages appear here after the AI generates outreach for your campaigns.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
      <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-md border">
        {/* Left: Message list */}
        <div className="w-[350px] shrink-0 border-r overflow-hidden">
          <MessageList
            messages={messages}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right: Detail */}
        <div className="flex-1 overflow-hidden">
          <MessageDetail message={selectedMessage} />
        </div>
      </div>
    </div>
  );
}
