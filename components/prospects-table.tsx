"use client";

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
import { PipelineBadge } from "@/components/pipeline-badge";
import type { Prospect, EnrichmentJob } from "@/lib/supabase/types";

type ProspectWithJob = Prospect & {
  enrichment_jobs: Pick<EnrichmentJob, "stage" | "error_message">[];
};

interface ProspectsTableProps {
  prospects: ProspectWithJob[];
}

export function ProspectsTable({ prospects }: ProspectsTableProps) {
  async function handleReEnrich(prospectId: string) {
    await fetch(`/api/prospects/${prospectId}/enrich`, { method: "POST" });
    window.location.reload();
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Employer</TableHead>
          <TableHead>Match Eligible</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead className="w-16">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prospects.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No prospects yet. Import a CSV to get started.
            </TableCell>
          </TableRow>
        ) : (
          prospects.map((prospect) => {
            const job = prospect.enrichment_jobs[0];
            return (
              <TableRow key={prospect.id}>
                <TableCell className="font-medium">{prospect.name}</TableCell>
                <TableCell>{prospect.email || "—"}</TableCell>
                <TableCell>{prospect.employer || "—"}</TableCell>
                <TableCell>{prospect.match_eligible ? "Yes" : "No"}</TableCell>
                <TableCell>
                  {job && <PipelineBadge stage={job.stage} />}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-7 items-center rounded-none px-2.5 text-xs font-medium hover:bg-muted"
                    >
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
  );
}
