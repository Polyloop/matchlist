"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface MessagePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    id: string;
    prospectName: string;
    content: string;
    status: string;
    sent_at: string | null;
  } | null;
  onStatusChange?: () => void;
}

function statusVariant(status: string) {
  switch (status) {
    case "sent":
      return "default" as const;
    case "approved":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function MessagePanel({
  open,
  onOpenChange,
  message,
  onStatusChange,
}: MessagePanelProps) {
  const [loading, setLoading] = useState(false);

  if (!message) return null;

  async function handleApprove() {
    if (!message) return;
    setLoading(true);
    await fetch(`/api/outreach/${message.id}/approve`, { method: "POST" });
    setLoading(false);
    onStatusChange?.();
  }

  async function handleSend() {
    if (!message) return;
    setLoading(true);
    await fetch(`/api/outreach/${message.id}/send`, { method: "POST" });
    setLoading(false);
    onOpenChange(false);
    onStatusChange?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Message for {message.prospectName}</SheetTitle>
          <SheetDescription>
            <Badge variant={statusVariant(message.status)} className="mt-1">
              {message.status}
            </Badge>
            {message.sent_at && (
              <span className="ml-2 text-xs text-muted-foreground">
                Sent {new Date(message.sent_at).toLocaleDateString()}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Textarea
            className="min-h-[300px] font-mono text-sm"
            value={message.content}
            readOnly
          />
          <div className="flex justify-end gap-2">
            {message.status === "draft" && (
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? "Approving..." : "Approve"}
              </Button>
            )}
            {message.status === "approved" && (
              <Button onClick={handleSend} disabled={loading}>
                {loading ? "Sending..." : "Send Now"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
