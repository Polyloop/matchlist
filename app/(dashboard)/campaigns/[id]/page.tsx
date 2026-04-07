"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
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
import { useEnrichmentRealtime } from "@/hooks/use-enrichment-realtime";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload04Icon, PlayIcon } from "@hugeicons/core-free-icons";
import type {
  CampaignEnrichmentConfig,
  EnrichmentResult,
  EnrichmentResultStatus,
} from "@/lib/supabase/types";
// Ensure all enrichment types are registered
import "@/lib/enrichments";
import { getEnrichmentType, getDisplayValue } from "@/lib/enrichments";

interface ProspectRow {
  id: string;
  name: string;
  email: string | null;
  employer: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

export default function CampaignTablePage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [enrichmentConfigs, setEnrichmentConfigs] = useState<CampaignEnrichmentConfig[]>([]);
  const [enrichmentResults, setEnrichmentResults] = useState<EnrichmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Detail panel state
  const [detailResult, setDetailResult] = useState<EnrichmentResult | null>(null);
  const [detailProspectName, setDetailProspectName] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prospectsRes, configsRes, resultsRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}/prospects?limit=200`),
        fetch(`/api/campaigns/${campaignId}/enrichment-configs`),
        fetch(`/api/campaigns/${campaignId}/enrichment-results`),
      ]);

      if (prospectsRes.ok) {
        const data = await prospectsRes.json();
        setProspects(data.prospects ?? []);
      }
      if (configsRes.ok) {
        const data = await configsRes.json();
        setEnrichmentConfigs(data.configs ?? []);
      }
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setEnrichmentResults(data.results ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime updates
  const handleRealtimeUpdate = useCallback((updated: EnrichmentResult) => {
    setEnrichmentResults((prev) => {
      const idx = prev.findIndex(
        (r) =>
          r.prospect_id === updated.prospect_id &&
          r.enrichment_type === updated.enrichment_type,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }, []);

  useEnrichmentRealtime(campaignId, handleRealtimeUpdate);

  // Build lookup: prospectId -> enrichmentType -> EnrichmentResult
  const resultsMap = useMemo(() => {
    const map = new Map<string, Map<string, EnrichmentResult>>();
    for (const r of enrichmentResults) {
      if (!map.has(r.prospect_id)) map.set(r.prospect_id, new Map());
      map.get(r.prospect_id)!.set(r.enrichment_type, r);
    }
    return map;
  }, [enrichmentResults]);

  // Status counts per enrichment type
  const statusCounts = useMemo(() => {
    const counts: Record<string, Record<EnrichmentResultStatus, number>> = {};
    for (const r of enrichmentResults) {
      if (!counts[r.enrichment_type]) {
        counts[r.enrichment_type] = { pending: 0, running: 0, success: 0, failed: 0 };
      }
      counts[r.enrichment_type][r.status]++;
    }
    return counts;
  }, [enrichmentResults]);

  // Run column enrichment
  async function handleRunColumn(enrichmentType: string) {
    const res = await fetch("/api/enrichments/run-column", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, enrichmentType }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Queued ${data.queued} prospects for ${enrichmentType.replace(/_/g, " ")}`);
      loadData();
    } else {
      toast.error("Failed to start enrichment");
    }
  }

  // Retry failed enrichment
  async function handleRetry(resultId: string) {
    const res = await fetch("/api/enrichments/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultId }),
    });
    if (res.ok) {
      toast.success("Retry queued");
    }
  }

  // Build columns dynamically
  const columns = useMemo((): ColumnDef<ProspectRow>[] => {
    const staticCols: ColumnDef<ProspectRow>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
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
      },
      {
        accessorKey: "email",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("email") || "—"}</span>
        ),
      },
    ];

    // Dynamic enrichment columns from campaign config
    const enrichmentCols: ColumnDef<ProspectRow>[] = enrichmentConfigs
      .filter((c) => c.enabled)
      .sort((a, b) => a.column_order - b.column_order)
      .map((config): ColumnDef<ProspectRow> => ({
        id: `enrichment_${config.enrichment_type}`,
        header: () => (
          <div className="flex items-center gap-2">
            <EnrichmentColumnHeader
              enrichmentType={config.enrichment_type}
              statusCounts={statusCounts[config.enrichment_type]}
              totalRows={prospects.length}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleRunColumn(config.enrichment_type);
              }}
              title={`Run ${config.enrichment_type.replace(/_/g, " ")} for all rows`}
            >
              <HugeiconsIcon icon={PlayIcon} strokeWidth={1.5} className="size-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const prospectId = row.original.id;
          const result = resultsMap.get(prospectId)?.get(config.enrichment_type);

          return (
            <EnrichmentCell
              enrichmentType={config.enrichment_type}
              status={result?.status || null}
              result={result?.result || null}
              errorMessage={result?.error_message || null}
              onRetry={result?.status === "failed" ? () => handleRetry(result.id) : undefined}
              onClick={result?.status === "success" ? () => {
                setDetailResult(result);
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
  }, [enrichmentConfigs, resultsMap, statusCounts, prospects.length]);

  const table = useReactTable({
    data: prospects,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
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

  if (prospects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-medium">No prospects in this campaign</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a CSV to add prospects to this campaign
          </p>
        </div>
        <Button render={<Link href={`/campaigns/${campaignId}/import`} />}>
          Import Prospects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="sticky top-0 bg-background"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      <EnrichmentDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        result={detailResult}
        prospectName={detailProspectName}
        onRetry={(id) => {
          handleRetry(id);
          setDetailOpen(false);
        }}
      />
    </div>
  );
}
