"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/prospects/data-table-pagination";
import { DataTableColumnHeader } from "@/components/prospects/data-table-column-header";
import { EnrichmentCell } from "@/components/enrichment-cell";
import { EnrichmentColumnHeader } from "@/components/enrichment-column-header";
import { EnrichmentDetailPanel } from "@/components/enrichment-detail-panel";
import { ExportButton } from "@/components/export-button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload04Icon, PlayIcon } from "@hugeicons/core-free-icons";
import "@/lib/enrichments";
import type { Id } from "@/convex/_generated/dataModel";
import type { EnrichmentResultStatus } from "@/lib/types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

export default function CampaignTablePage() {
  const params = useParams();
  const campaignId = params.id as Id<"campaigns">;

  // All three queries are reactive — cells update automatically
  const prospects = useQuery(api.prospects.queries.list, { campaignId });
  const enrichmentConfigs = useQuery(api.campaigns.queries.getEnrichmentConfigs, { campaignId });
  const enrichmentResults = useQuery(api.campaigns.queries.getEnrichmentResults, { campaignId });

  const runColumn = useMutation(api.enrichments.mutations.runColumn);
  const retryEnrichment = useMutation(api.enrichments.mutations.retry);
  const rerunPipeline = useMutation(api.pipeline.actions.rerunPipeline);

  const loading = prospects === undefined;

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [detailResult, setDetailResult] = useState<NonNullable<typeof enrichmentResults>[number] | null>(null);
  const [detailProspectName, setDetailProspectName] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  // Build lookup: prospectId -> enrichmentType -> result
  const resultsMap = useMemo(() => {
    const map = new Map<string, Map<string, NonNullable<typeof enrichmentResults>[number]>>();
    for (const r of enrichmentResults ?? []) {
      if (!map.has(r.prospectId)) map.set(r.prospectId, new Map());
      map.get(r.prospectId)!.set(r.enrichmentType, r);
    }
    return map;
  }, [enrichmentResults]);

  // Status counts per enrichment type
  const statusCounts = useMemo(() => {
    const counts: Record<string, Record<EnrichmentResultStatus, number>> = {};
    for (const r of enrichmentResults ?? []) {
      if (!counts[r.enrichmentType]) {
        counts[r.enrichmentType] = { pending: 0, running: 0, success: 0, failed: 0 };
      }
      counts[r.enrichmentType][r.status as EnrichmentResultStatus]++;
    }
    return counts;
  }, [enrichmentResults]);

  async function handleRunColumn(enrichmentType: string) {
    try {
      const data = await runColumn({ campaignId, enrichmentType });
      toast.success(`Queued ${data.queued} prospects for ${enrichmentType.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to start enrichment");
    }
  }

  async function handleRetry(resultId: Id<"enrichmentResults">) {
    try {
      await retryEnrichment({ resultId });
      toast.success("Retry queued");
    } catch {
      toast.error("Failed to retry");
    }
  }

  // Build columns dynamically
  const columns = useMemo((): ColumnDef<NonNullable<typeof prospects>[number]>[] => {
    const staticCols: ColumnDef<NonNullable<typeof prospects>[number]>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {getInitials(row.getValue("name") as string)}
            </span>
            <span className="font-medium">{row.getValue("name") as string}</span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{(row.getValue("email") as string) || "—"}</span>
        ),
      },
    ];

    const enrichmentCols: ColumnDef<NonNullable<typeof prospects>[number]>[] = (enrichmentConfigs ?? [])
      .filter((c) => c.enabled)
      .sort((a, b) => a.columnOrder - b.columnOrder)
      .map((config) => ({
        id: `enrichment_${config.enrichmentType}`,
        header: () => (
          <div className="flex items-center gap-2">
            <EnrichmentColumnHeader
              enrichmentType={config.enrichmentType}
              statusCounts={statusCounts[config.enrichmentType]}
              totalRows={(prospects ?? []).length}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => { e.stopPropagation(); handleRunColumn(config.enrichmentType); }}
              title={`Run ${config.enrichmentType.replace(/_/g, " ")}`}
            >
              <HugeiconsIcon icon={PlayIcon} strokeWidth={1.5} className="size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }: { row: { original: NonNullable<typeof prospects>[number] } }) => {
          const result = resultsMap.get(row.original._id)?.get(config.enrichmentType);
          return (
            <EnrichmentCell
              enrichmentType={config.enrichmentType}
              status={(result?.status as EnrichmentResultStatus) || null}
              result={(result?.result as Record<string, unknown>) || null}
              errorMessage={result?.errorMessage || null}
              onRetry={result?.status === "failed" ? () => handleRetry(result._id) : undefined}
              onClick={result?.status === "success" ? () => {
                setDetailResult(result as typeof detailResult);
                setDetailProspectName(row.original.name);
                setDetailOpen(true);
              } : undefined}
            />
          );
        },
        enableSorting: false,
        size: 160,
      }));

    return [...staticCols, ...enrichmentCols];
  }, [enrichmentConfigs, resultsMap, statusCounts, prospects]);

  const table = useReactTable({
    data: prospects ?? [],
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if ((prospects ?? []).length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-medium">No prospects in this campaign</p>
          <p className="mt-1 text-sm text-muted-foreground">Import a CSV to add prospects</p>
        </div>
        <Button render={<Link href={`/campaigns/${campaignId}/import`} />}>
          Import Prospects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              const r = await rerunPipeline({ campaignId });
              toast.success(`Pipeline re-started for ${r.triggered} prospects`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to re-run");
            }
          }}
        >
          <HugeiconsIcon icon={PlayIcon} strokeWidth={1.5} className="mr-1.5 size-3.5" />
          Re-run Pipeline
        </Button>
        <ExportButton campaignId={campaignId} />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }} className="sticky top-0 bg-background">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
      <EnrichmentDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        result={detailResult as any}
        prospectName={detailProspectName}
        onRetry={(id) => { handleRetry(id as Id<"enrichmentResults">); setDetailOpen(false); }}
      />
    </div>
  );
}
