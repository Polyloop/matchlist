"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineBadge } from "@/components/pipeline-badge";
import { ProspectListsPanel } from "@/components/prospect-lists-panel";
import { buttonVariants } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  Search01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import type { EnrichmentStage } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input hover:border-primary/50",
      )}
    >
      {checked && (
        <svg
          width="10"
          height="8"
          viewBox="0 0 10 8"
          fill="none"
          className="text-current"
        >
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function ProspectsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<ListOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedBatchId = searchParams.get("batch_id");

  const loadProspects = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/prospects?limit=50";
      if (selectedListId) {
        url += `&list_id=${selectedListId}`;
      }
      if (selectedBatchId) {
        url += `&batch_id=${selectedBatchId}`;
      }
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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedBatchId]);

  const filteredProspects = useMemo(() => {
    if (!searchQuery.trim()) return prospects;
    const q = searchQuery.toLowerCase();
    return prospects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.employer?.toLowerCase().includes(q),
    );
  }, [prospects, searchQuery]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProspects.map((p) => p.id)));
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

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
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

        {/* Search bar */}
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={1.5}
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search prospects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : filteredProspects.length === 0 && !searchQuery && !selectedListId && !selectedBatchId ? (
          /* Empty state */
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
            <Link
              href="/prospects/import"
              className={cn(buttonVariants())}
            >
              Import Your First List
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      filteredProspects.length > 0 &&
                      selectedIds.size === filteredProspects.length
                    }
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {searchQuery
                      ? "No prospects match your search."
                      : selectedListId
                        ? "No prospects in this list."
                        : "No prospects found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProspects.map((prospect) => {
                  const job = prospect.enrichment_jobs?.[0];
                  return (
                    <TableRow key={prospect.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(prospect.id)}
                          onChange={() => toggleSelect(prospect.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {getInitials(prospect.name)}
                          </span>
                          <span className="font-medium">{prospect.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {prospect.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {prospect.employer || "—"}
                      </TableCell>
                      <TableCell>
                        {prospect.match_eligible ? (
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-primary" />
                            <span className="text-xs text-primary">
                              Eligible
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {job && <PipelineBadge stage={job.stage} />}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <HugeiconsIcon
                              icon={MoreVerticalIcon}
                              strokeWidth={1.5}
                              className="size-4"
                            />
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
        )}
      </div>
    </div>
  );
}
