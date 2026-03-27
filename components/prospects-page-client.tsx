"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PipelineBadge } from "@/components/pipeline-badge";
import { ProspectListsPanel } from "@/components/prospect-lists-panel";
import type { EnrichmentStage } from "@/lib/supabase/types";

interface ProspectRow {
  id: string;
  name: string;
  email: string | null;
  employer: string | null;
  match_eligible: boolean;
  enrichment_jobs: Array<{ stage: EnrichmentStage; error_message: string | null }>;
}

interface ListOption {
  id: string;
  name: string;
  prospect_count: number;
}

export function ProspectsPageClient() {
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<ListOption[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProspects = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/prospects?limit=50";
      if (selectedListId) {
        url += `&list_id=${selectedListId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProspects(data.prospects ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedListId]);

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    }
  }

  async function handleAssignToList(listId: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const res = await fetch(`/api/lists/${listId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: ids }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(`Added ${data.added} prospects to list`);
      setSelectedIds(new Set());
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

  return (
    <div className="flex gap-6">
      <ProspectListsPanel
        selectedListId={selectedListId}
        onSelectList={(id) => {
          setSelectedListId(id);
          setSelectedIds(new Set());
        }}
      />

      <div className="min-w-0 flex-1 space-y-4">
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
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
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Input
                  type="checkbox"
                  className="size-4"
                  checked={
                    prospects.length > 0 &&
                    selectedIds.size === prospects.length
                  }
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Match Eligible</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : prospects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {selectedListId
                    ? "No prospects in this list."
                    : "No prospects yet. Import a CSV to get started."}
                </TableCell>
              </TableRow>
            ) : (
              prospects.map((prospect) => {
                const job = prospect.enrichment_jobs?.[0];
                return (
                  <TableRow key={prospect.id}>
                    <TableCell>
                      <Input
                        type="checkbox"
                        className="size-4"
                        checked={selectedIds.has(prospect.id)}
                        onChange={() => toggleSelect(prospect.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {prospect.name}
                    </TableCell>
                    <TableCell>{prospect.email || "—"}</TableCell>
                    <TableCell>{prospect.employer || "—"}</TableCell>
                    <TableCell>
                      {prospect.match_eligible ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      {job && <PipelineBadge stage={job.stage} />}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-7 items-center rounded-none px-2.5 text-xs font-medium hover:bg-muted">
                          ...
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleReEnrich(prospect.id)}
                          >
                            Re-enrich
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
