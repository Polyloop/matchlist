"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// Note: DialogTrigger from base-ui renders its own element, no asChild needed

interface MessagePreviewProps {
  messageId: string;
  prospectName: string;
  content: string;
  status: string;
}

export function MessagePreview({
  messageId,
  prospectName,
  content,
  status,
}: MessagePreviewProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    await fetch(`/api/outreach/${messageId}/approve`, { method: "POST" });
    setLoading(false);
    window.location.reload();
  }

  async function handleSend() {
    setLoading(true);
    await fetch(`/api/outreach/${messageId}/send`, { method: "POST" });
    setLoading(false);
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-7 items-center rounded-none px-2.5 text-xs font-medium hover:bg-muted"
      >
        View
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Message for {prospectName}</DialogTitle>
        </DialogHeader>
        <Textarea
          className="min-h-[200px]"
          value={content}
          readOnly
        />
        <div className="flex justify-end gap-2">
          {status === "draft" && (
            <Button onClick={handleApprove} disabled={loading}>
              Approve
            </Button>
          )}
          {status === "approved" && (
            <Button onClick={handleSend} disabled={loading}>
              Send Now
            </Button>
          )}
          {status === "sent" && (
            <span className="text-sm text-muted-foreground">Sent</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
