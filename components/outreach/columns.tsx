"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/prospects/data-table-column-header";
import type { OutreachStatus } from "@/lib/supabase/types";

export interface OutreachRow {
  id: string;
  prospectName: string;
  prospectEmail: string | null;
  content: string;
  status: OutreachStatus;
  sent_at: string | null;
  created_at: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
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

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Needs Review";
    case "approved":
      return "Approved";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function getOutreachColumns(
  onViewMessage: (row: OutreachRow) => void,
): ColumnDef<OutreachRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "prospectName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Prospect" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("prospectName") as string;
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {getInitials(name)}
            </span>
            <span className="font-medium">{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "content",
      header: "Message Preview",
      cell: ({ row }) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground">
          {(row.getValue("content") as string).slice(0, 100)}...
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={statusVariant(status)}>
            {statusLabel(status)}
          </Badge>
        );
      },
      filterFn: (row, _id, value) => {
        if (!value || (value as string[]).length === 0) return true;
        return (value as string[]).includes(row.getValue("status") as string);
      },
    },
    {
      accessorKey: "sent_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sent At" />
      ),
      cell: ({ row }) => {
        const sentAt = row.getValue("sent_at") as string | null;
        return (
          <span className="text-sm text-muted-foreground">
            {sentAt ? new Date(sentAt).toLocaleDateString() : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewMessage(row.original)}
        >
          View
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 60,
    },
  ];
}
