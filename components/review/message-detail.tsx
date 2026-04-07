"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Id } from "@/convex/_generated/dataModel";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  MailSend01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

interface MessageDetailProps {
  message: {
    _id: Id<"outreachMessages">;
    prospectName: string;
    prospectEmail: string | null;
    subject: string | null;
    content: string;
    status: string;
    confidenceScore: number | null;
    campaignName: string | null;
    campaignType: string | null;
    sentAt?: number | null;
    respondedAt?: number | null;
    _creationTime: number;
  } | null;
}

export function MessageDetail({ message }: MessageDetailProps) {
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  const approve = useMutation(api.outreach.mutations.approve);
  const sendNow = useMutation(api.outreach.mutations.sendNow);
  const markResponded = useMutation(api.outreach.mutations.markResponded);
  const updateContent = useMutation(api.outreach.mutations.updateContent);
  const discard = useMutation(api.outreach.mutations.discard);

  if (!message) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a message to preview
      </div>
    );
  }

  function startEditing() {
    setEditSubject(message!.subject || "");
    setEditContent(message!.content);
    setEditing(true);
  }

  async function saveEdit() {
    setLoading(true);
    try {
      await updateContent({
        id: message!._id,
        subject: editSubject,
        content: editContent,
      });
      toast.success("Message updated");
      setEditing(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setLoading(true);
    try {
      await approve({ id: message!._id });
      toast.success("Message approved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNow() {
    setLoading(true);
    try {
      await sendNow({ id: message!._id });
      toast.success("Send triggered");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscard() {
    setLoading(true);
    try {
      await discard({ id: message!._id });
      toast.success("Message discarded");
    } catch {
      toast.error("Failed to discard");
    } finally {
      setLoading(false);
    }
  }

  // Split content into body and signature (last block after double newline)
  const parts = message.content.split(/\n\n(?=[A-Z][\w ]+\n)/);
  const body = parts.length > 1 ? parts.slice(0, -1).join("\n\n") : message.content;
  const signature = parts.length > 1 ? parts[parts.length - 1] : null;

  return (
    <div className="flex h-full flex-col">
      {/* Email header */}
      <div className="space-y-3 border-b p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">
              {message.subject || "No subject"}
            </h2>
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <p>To: <span className="text-foreground">{message.prospectName}</span> &lt;{message.prospectEmail || "no email"}&gt;</p>
              {message.campaignName && (
                <p>Campaign: <span className="text-foreground">{message.campaignName}</span></p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {message.confidenceScore != null && message.confidenceScore > 0 && (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {message.confidenceScore}% confidence
              </span>
            )}
            <Badge
              variant={
                message.status === "sent" ? "default"
                : message.status === "approved" ? "secondary"
                : message.status === "failed" ? "destructive"
                : "outline"
              }
            >
              {message.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-y-auto p-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Subject</label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Body</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="mt-1 min-h-[300px] text-sm leading-relaxed"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="whitespace-pre-line text-sm leading-relaxed">
              {body}
            </div>
            {signature && (
              <>
                <Separator />
                <div className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed">
                  {signature}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={saveEdit} disabled={loading}>
                Save Changes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              {message.status === "draft" && (
                <>
                  <Button size="sm" onClick={handleApprove} disabled={loading}>
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
                    Edit
                  </Button>
                </>
              )}
              {message.status === "approved" && (
                <Button size="sm" onClick={handleSendNow} disabled={loading}>
                  <HugeiconsIcon icon={MailSend01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
                  {loading ? "Sending..." : "Send Now"}
                </Button>
              )}
              {message.status === "sent" && !message.respondedAt && (
                <Button size="sm" variant="outline" onClick={async () => {
                  setLoading(true);
                  try {
                    await markResponded({ id: message._id });
                    toast.success("Marked as responded");
                  } catch { toast.error("Failed"); }
                  finally { setLoading(false); }
                }} disabled={loading} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
                  Mark Responded
                </Button>
              )}
              {message.respondedAt && (
                <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                  Responded {new Date(message.respondedAt).toLocaleDateString()}
                </Badge>
              )}
              <div className="flex-1" />
              {(message.status === "draft" || message.status === "failed") && (
                <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={loading} className="text-destructive hover:text-destructive">
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
                  Discard
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
