"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MessageList, type MessageListItem } from "@/components/review/message-list";
import { MessageDetail } from "@/components/review/message-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export default function CampaignOutreachPage() {
  const params = useParams();
  const campaignId = params.id as Id<"campaigns">;

  const rawMessages = useQuery(api.outreach.queries.list, { campaignId });
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
      sentAt: raw.sentAt,
      _creationTime: raw._creationTime,
    };
  }, [selectedId, rawMessages]);

  if (!selectedId && messages.length > 0) {
    setTimeout(() => setSelectedId(messages[0]._id), 0);
  }

  if (loading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No outreach messages for this campaign yet. Run the pipeline to generate messages.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-280px)] overflow-hidden rounded-md border">
      <div className="w-[320px] shrink-0 border-r">
        <MessageList messages={messages} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div className="flex-1">
        <MessageDetail message={selectedMessage} />
      </div>
    </div>
  );
}
