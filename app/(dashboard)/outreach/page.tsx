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

export default async function OutreachPage() {
  const { orgId } = await requireOrg();
  const supabase = createAdminClient();

  const { data: messages } = await supabase
    .from("outreach_messages")
    .select("*, prospects(name, email)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Outreach Messages</h1>
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
          {(!messages || messages.length === 0) ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No outreach messages yet. Messages are generated after prospect enrichment.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((msg) => {
              const prospect = msg.prospects as { name: string; email: string } | null;
              return (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium">
                    {prospect?.name || "Unknown"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {msg.content.slice(0, 80)}...
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        msg.status === "sent"
                          ? "default"
                          : msg.status === "approved"
                            ? "secondary"
                            : msg.status === "failed"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {msg.sent_at
                      ? new Date(msg.sent_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <MessagePreview
                      messageId={msg.id}
                      prospectName={prospect?.name || "Unknown"}
                      content={msg.content}
                      status={msg.status}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
