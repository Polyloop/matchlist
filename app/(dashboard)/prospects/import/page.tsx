import { CsvUpload } from "@/components/csv-upload";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Prospects</h1>
      <p className="text-sm text-muted-foreground">
        Upload a CSV file with prospect data. Map columns to fields, then import
        to start the enrichment pipeline.
      </p>
      <CsvUpload />
    </div>
  );
}
