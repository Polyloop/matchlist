"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProspectListsPanel } from "@/components/prospect-lists-panel";
import { buttonVariants } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload04Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

import { DataTable } from "@/components/prospects/data-table";
import { getColumns, type ProspectRow } from "@/components/prospects/columns";

interface ListOption {
  id: string;
  name: string;
  prospect_count: number;
}

export function ProspectsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<ProspectRow[]>([]);
  const [lists, setLists] = useState<ListOption[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedBatchId = searchParams.get("batch_id");

  const loadProspects = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/prospects?limit=200";
      if (selectedListId) url += `&list_id=${selectedListId}`;
      if (selectedBatchId) url += `&batch_id=${selectedBatchId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProspects(data.prospects ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId, selectedListId]);

  async function loadLists() {
    const res = await fetch("/api/lists");
    if (res.ok) {
      setLists(await res.json());
    }
  }

  useEffect(() => {
    loadProspects();
    loadLists();
  }, [loadProspects]);

  async function handleAssignToList(listId: string) {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;

    const res = await fetch(`/api/lists/${listId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: ids }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(`Added ${data.added} prospects to list`);
      setSelectedRows([]);
      loadLists();
    } else {
      toast.error("Failed to assign prospects");
    }
  }

  async function handleReEnrich(prospectId: string) {
    await fetch(`/api/prospects/${prospectId}/enrich`, { method: "POST" });
    toast.success("Re-enrichment triggered");
    loadProspects();
  }

  const columns = useMemo(() => getColumns(handleReEnrich), []);

  return (
    <div className="flex gap-6">
      <ProspectListsPanel
        selectedListId={selectedListId}
        onSelectList={(id) => {
          setSelectedListId(id);
          setSelectedRows([]);
        }}
      />

      <div className="min-w-0 flex-1 space-y-4">
        {selectedBatchId && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2">
            <span className="text-sm font-medium">
              Viewing the uploaded cohort behind your latest Match Revenue Reveal
            </span>
            <Link
              href={`/imports/${selectedBatchId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to Reveal
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/prospects")}
            >
              Clear Filter
            </Button>
          </div>
        )}

        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">
              {selectedRows.length} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-7 items-center rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted">
                Assign to list
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {lists.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No lists — create one first
                  </DropdownMenuItem>
                ) : (
                  lists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() => handleAssignToList(list.id)}
                    >
                      {list.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRows([])}
            >
              Clear
            </Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : prospects.length === 0 && !selectedListId && !selectedBatchId ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={Upload04Icon}
                strokeWidth={1.5}
                className="size-8 text-muted-foreground"
              />
            </div>
            <div>
              <p className="text-lg font-medium">No prospects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Import a CSV to start finding matching gift opportunities
              </p>
            </div>
            <Link href="/prospects/import" className={cn(buttonVariants())}>
              Import Your First List
            </Link>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={prospects}
            onRowSelectionChange={setSelectedRows}
          />
        )}
      </div>
    </div>
  );
}
