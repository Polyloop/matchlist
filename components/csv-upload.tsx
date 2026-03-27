"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PROSPECT_FIELDS = ["name", "email", "linkedin_url", "employer"];

export function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: Array<{ row: number; message: string }>;
    total: number;
  } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
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
        // Auto-map matching column names
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
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    const res = await fetch("/api/prospects/import", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setResult(data);
    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <Input type="file" accept=".csv" onChange={handleFileChange} />
      </div>

      {headers.length > 0 && (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Map CSV columns to fields</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {headers.map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="min-w-24 text-sm text-muted-foreground">
                    {col}
                  </span>
                  <select
                    className="rounded-md border px-2 py-1 text-sm"
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
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Preview (first 5 rows)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h}>{row[h]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importing..." : "Import & Start Enrichment"}
          </Button>
        </>
      )}

      {result && (
        <div className="rounded-md border p-4">
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
