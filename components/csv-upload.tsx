"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const PROSPECT_FIELDS = [
  "name",
  "email",
  "linkedin_url",
  "employer",
  "team",
  "campaign",
];

const STEPS = [
  { label: "Upload" },
  { label: "Map Columns" },
  { label: "Review & Import" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isCompleted
                    ? "bg-primary/20 text-primary"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    className="size-4"
                  />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive
                    ? "text-foreground"
                    : isCompleted
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-px w-10",
                  i < currentStep ? "bg-primary/30" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CsvUploadProps {
  campaignId?: string;
}

export function CsvUpload({ campaignId }: CsvUploadProps = {}) {
  const router = useRouter();
  const importMutation = useMutation(api.prospects.mutations.importProspects);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: Array<{ row: number; message: string }>;
    total: number;
  } | null>(null);

  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const currentStep = !file ? 0 : headers.length > 0 && Object.values(mapping).some(Boolean) ? 2 : 1;

  // Extract emails from preview data for duplicate check
  const previewEmails = useMemo(() => {
    const emailField = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
    if (!emailField) return [];
    return preview.map((row) => row[emailField]).filter(Boolean);
  }, [mapping, preview]);

  const duplicates = useQuery(
    api.prospects.duplicates.checkDuplicates,
    previewEmails.length > 0
      ? { emails: previewEmails, campaignId: campaignId ? campaignId as Id<"campaigns"> : undefined }
      : "skip",
  );

  const processFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);

    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete(results) {
        const cols = results.meta.fields ?? [];
        setHeaders(cols);
        setPreview(results.data);
        const autoMap: Record<string, string> = {};
        for (const col of cols) {
          const lower = col.toLowerCase().replace(/[^a-z_]/g, "");
          if (PROSPECT_FIELDS.includes(lower)) {
            autoMap[col] = lower;
          }
        }
        setMapping(autoMap);
      },
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".csv")) {
      processFile(f);
    } else {
      toast.error("Please drop a CSV file");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      // Parse CSV and apply mapping client-side
      const csvText = await file.text();
      const { data: csvRows } = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = csvRows.map((raw) => {
        const mapped: Record<string, string> = {};
        if (Object.keys(mapping).length > 0) {
          for (const [csvCol, fieldName] of Object.entries(mapping)) {
            if (raw[csvCol] !== undefined) mapped[fieldName] = raw[csvCol];
          }
        } else {
          Object.assign(mapped, raw);
        }
        return {
          name: mapped.name || "",
          email: mapped.email || undefined,
          linkedinUrl: mapped.linkedin_url || undefined,
          employer: mapped.employer || undefined,
          team: mapped.team || undefined,
          campaign: mapped.campaign || undefined,
        };
      });

      // Filter out duplicates if enabled
      const duplicateEmails = new Set(
        skipDuplicates && duplicates ? duplicates.map((d) => d.email) : [],
      );
      const filteredRows = duplicateEmails.size > 0
        ? rows.filter((r) => !r.email || !duplicateEmails.has(r.email))
        : rows;

      if (filteredRows.length === 0) {
        toast.error("All prospects are duplicates — nothing to import");
        setImporting(false);
        return;
      }

      const data = await importMutation({
        campaignId: campaignId ? campaignId as Id<"campaigns"> : undefined,
        filename: file.name,
        rows: filteredRows,
      });

      if (data.imported > 0 && data.batchId) {
        if (data.errors?.length > 0) {
          toast.success(
            `Imported ${data.imported} prospects with ${data.errors.length} row errors`,
          );
        } else {
          toast.success(`Imported ${data.imported} prospects`);
        }
        router.push(`/imports/${data.batchId}`);
        return;
      }

      setResult(data);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={currentStep} />

      {/* Drop zone / file display */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30",
          )}
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={CloudUploadIcon}
              strokeWidth={1.5}
              className="size-7 text-muted-foreground"
            />
          </div>
          <div>
            <p className="text-sm font-medium">
              Drop your CSV here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We&apos;ll check each person&apos;s employer for matching gift programs
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <HugeiconsIcon
            icon={CloudUploadIcon}
            strokeWidth={1.5}
            className="size-5 text-primary"
          />
          <span className="flex-1 truncate text-sm font-medium">
            {file.name}
          </span>
          <button
            onClick={() => {
              setFile(null);
              setHeaders([]);
              setPreview([]);
              setMapping({});
              setResult(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Change file
          </button>
        </div>
      )}

      {/* Column mapping */}
      {headers.length > 0 && (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Map CSV columns to fields</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {headers.map((col) => {
                const isMapped = !!mapping[col];
                return (
                  <div key={col} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        isMapped ? "bg-primary" : "bg-border",
                      )}
                    />
                    <span className="min-w-24 truncate text-sm text-muted-foreground">
                      {col}
                    </span>
                    <select
                      className="rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                      value={mapping[col] || ""}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [col]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Skip</option>
                      {PROSPECT_FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Preview (first 5 rows)</h3>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h}>
                        <span className={cn(mapping[h] ? "text-foreground" : "text-muted-foreground/60")}>
                          {h}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((h) => (
                        <TableCell
                          key={h}
                          className={cn(!mapping[h] && "text-muted-foreground/60")}
                        >
                          {row[h]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Duplicate warning */}
          {duplicates && duplicates.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {duplicates.length} duplicate{duplicates.length !== 1 ? "s" : ""} found
              </p>
              <div className="mt-2 space-y-1">
                {duplicates.slice(0, 5).map((d, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                    {d.email} — already in {d.existingCampaignName || "another campaign"} ({d.existingProspectName})
                  </p>
                ))}
                {duplicates.length > 5 && (
                  <p className="text-xs text-amber-600">...and {duplicates.length - 5} more</p>
                )}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded"
                />
                <span className="text-amber-700 dark:text-amber-400">Skip duplicates on import</span>
              </label>
            </div>
          )}

          <Button onClick={handleImport} disabled={importing} size="lg">
            {importing ? "Importing..." : "Import & Start Enrichment"}
          </Button>
        </>
      )}

      {result && (
        <div className="rounded-lg border p-4">
          <p className="font-medium">
            Imported {result.imported} of {result.total} prospects
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 text-sm text-destructive">
              {result.errors.map((err, i) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
