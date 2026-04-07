"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "./data-table-column-header";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { PipelineBadge } from "@/components/pipeline-badge";
import type { EnrichmentStage } from "@/lib/supabase/types";

export interface ProspectRow {
  id: string;
  name: string;
  email: string | null;
  employer: string | null;
  match_eligible: boolean;
  enrichment_jobs: Array<{
    stage: EnrichmentStage;
    error_message: string | null;
  }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

export function getColumns(
  onReEnrich: (prospectId: string) => void,
): ColumnDef<ProspectRow>[] {
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
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {getInitials(name)}
            </span>
            <span className="font-medium">{name}</span>
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        const name = (row.getValue("name") as string).toLowerCase();
        const email = (row.original.email || "").toLowerCase();
        const employer = (row.original.employer || "").toLowerCase();
        const q = (value as string).toLowerCase();
        return name.includes(q) || email.includes(q) || employer.includes(q);
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("email") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "employer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Employer" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("employer") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "match_eligible",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Match" />
      ),
      cell: ({ row }) => {
        const eligible = row.getValue("match_eligible") as boolean;
        return eligible ? (
          <Badge variant="default" className="text-xs">
            Eligible
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
      filterFn: (row, _id, value) => {
        if (!value || (value as string[]).length === 0) return true;
        const eligible = row.getValue("match_eligible") as boolean;
        return (value as string[]).includes(String(eligible));
      },
    },
    {
      id: "stage",
      accessorFn: (row) => row.enrichment_jobs?.[0]?.stage,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stage" />
      ),
      cell: ({ row }) => {
        const job = row.original.enrichment_jobs?.[0];
        if (!job) return <span className="text-xs text-muted-foreground">—</span>;
        return <PipelineBadge stage={job.stage} />;
      },
      filterFn: (row, _id, value) => {
        if (!value || (value as string[]).length === 0) return true;
        const stage = row.original.enrichment_jobs?.[0]?.stage;
        return stage ? (value as string[]).includes(stage) : false;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <HugeiconsIcon
              icon={MoreVerticalIcon}
              strokeWidth={1.5}
              className="size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onReEnrich(row.original.id)}>
              Re-enrich
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
  ];
}
