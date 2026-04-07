"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download04Icon } from "@hugeicons/core-free-icons";
import type { Id } from "@/convex/_generated/dataModel";

interface ExportButtonProps {
  campaignId: Id<"campaigns">;
  campaignName?: string;
}

export function ExportButton({ campaignId, campaignName }: ExportButtonProps) {
  const csv = useQuery(api.exports.queries.campaignCsv, { campaignId });

  function handleExport() {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(campaignName || "campaign").replace(/\s+/g, "-").toLowerCase()}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={!csv}>
      <HugeiconsIcon icon={Download04Icon} strokeWidth={1.5} className="mr-1.5 size-3.5" />
      Export
    </Button>
  );
}
