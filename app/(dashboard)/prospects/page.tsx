import Link from "next/link";
import { ProspectsPageClient } from "@/components/prospects-page-client";

export default function ProspectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prospects</h1>
        <Link
          href="/prospects/import"
          className="inline-flex h-8 items-center border border-transparent bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Import CSV
        </Link>
      </div>
      <ProspectsPageClient />
    </div>
  );
}
