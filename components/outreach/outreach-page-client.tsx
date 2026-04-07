"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/prospects/data-table-pagination";
import { MessagePanel } from "./message-panel";
import { getOutreachColumns, type OutreachRow } from "./columns";
import { HugeiconsIcon } from "@hugeicons/react";
import { MailSend01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OutreachStatus } from "@/lib/supabase/types";

const statusTabs: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Needs Review", value: "draft" },
  { label: "Approved", value: "approved" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
];

export function OutreachPageClient() {
  const [messages, setMessages] = useState<OutreachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<OutreachRow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/outreach");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return messages;
    return messages.filter((m) => m.status === activeTab);
  }, [messages, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: messages.length };
    for (const m of messages) {
      counts[m.status] = (counts[m.status] || 0) + 1;
    }
    return counts;
  }, [messages]);

  function handleViewMessage(row: OutreachRow) {
    setSelectedMessage(row);
    setPanelOpen(true);
  }

  const columns = useMemo(() => getOutreachColumns(handleViewMessage), []);

  const table = useReactTable({
    data: filteredByTab,
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

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  async function handleBulkApprove() {
    const ids = Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((idx) => filteredByTab[Number(idx)]?.id)
      .filter(Boolean);
    if (ids.length === 0) return;

    const res = await fetch("/api/outreach/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      toast.success(`Approved ${ids.length} messages`);
      setRowSelection({});
      loadMessages();
    } else {
      toast.error("Failed to approve messages");
    }
  }

  async function handleBulkSend() {
    const ids = Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((idx) => filteredByTab[Number(idx)]?.id)
      .filter(Boolean);
    if (ids.length === 0) return;

    const res = await fetch("/api/outreach/bulk-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      toast.success(`Triggered send for ${ids.length} messages`);
      setRowSelection({});
      loadMessages();
    } else {
      toast.error("Failed to send messages");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Outreach Messages</h1>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Outreach Messages</h1>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={MailSend01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">No outreach messages yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Messages are generated after matching gift enrichment completes.
              Import prospects to get started.
            </p>
          </div>
          <Link href="/prospects/import" className={cn(buttonVariants())}>
            Import Prospects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Outreach Messages</h1>
        {tabCounts.draft > 0 && (
          <Badge variant="outline" className="text-xs">
            {tabCounts.draft} draft{tabCounts.draft !== 1 ? "s" : ""} to review
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setRowSelection({}); }}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {(tabCounts[tab.value] ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {tabCounts[tab.value]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          {activeTab === "draft" || activeTab === "all" ? (
            <Button size="sm" variant="outline" onClick={handleBulkApprove}>
              Approve Selected
            </Button>
          ) : null}
          {activeTab === "approved" || activeTab === "all" ? (
            <Button size="sm" variant="outline" onClick={handleBulkSend}>
              Send Selected
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setRowSelection({})}>
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
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
                  No messages in this category.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      <MessagePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        message={selectedMessage ? {
          id: selectedMessage.id,
          prospectName: selectedMessage.prospectName,
          content: selectedMessage.content,
          status: selectedMessage.status,
          sent_at: selectedMessage.sent_at,
        } : null}
        onStatusChange={loadMessages}
      />
    </div>
  );
}
