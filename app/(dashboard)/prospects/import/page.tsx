import { CsvUpload } from "@/components/csv-upload";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Import Prospects</h1>
      <CsvUpload />
    </div>
  );
}
