import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessagePreview } from "@/components/message-preview";
import { HugeiconsIcon } from "@hugeicons/react";
import { MailSend01Icon } from "@hugeicons/core-free-icons";
import type { OutreachStatus } from "@/lib/supabase/types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

const statusOrder: Record<string, number> = {
  draft: 0,
  approved: 1,
  sent: 2,
  failed: 3,
};

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

export default async function OutreachPage() {
  const { orgId } = await requireOrg();
  const supabase = createAdminClient();

  const { data: messages } = await supabase
    .from("outreach_messages")
    .select("*, prospects(name, email)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  const sorted = [...(messages || [])].sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9),
  );

  const draftCount = sorted.filter((m) => m.status === "draft").length;

  if (!messages || messages.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Outreach Messages
        </h1>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={MailSend01Icon}
              strokeWidth={1.5}
              className="size-8 text-muted-foreground"
            />
          </div>
          <div>
            <p className="text-lg font-medium">No outreach messages yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Messages are generated after matching gift enrichment completes.
              Import prospects to get started.
            </p>
          </div>
          <Link
            href="/prospects/import"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Import Prospects
          </Link>
        </div>
      </div>
    );
  }

  // Group by status for section headers
  type StatusGroup = { status: string; label: string; messages: typeof sorted };
  const groups: StatusGroup[] = [];
  let currentStatus = "";
  for (const msg of sorted) {
    if (msg.status !== currentStatus) {
      currentStatus = msg.status;
      const label =
        msg.status === "draft"
          ? "Needs Review"
          : msg.status === "approved"
            ? "Approved"
            : msg.status === "sent"
              ? "Sent"
              : "Failed";
      groups.push({ status: msg.status, label, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Outreach Messages
        </h1>
        {draftCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {draftCount} draft{draftCount !== 1 ? "s" : ""} to review
          </Badge>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.status} className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {group.label} ({group.messages.length})
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.messages.map((msg) => {
                const prospect = msg.prospects as {
                  name: string;
                  email: string;
                } | null;
                const name = prospect?.name || "Unknown";
                return (
                  <TableRow key={msg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {getInitials(name)}
                        </span>
                        <span className="font-medium">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {msg.content.slice(0, 80)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(msg.status as OutreachStatus)}>
                        {msg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {msg.sent_at
                        ? new Date(msg.sent_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <MessagePreview
                        messageId={msg.id}
                        prospectName={name}
                        content={msg.content}
                        status={msg.status}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
