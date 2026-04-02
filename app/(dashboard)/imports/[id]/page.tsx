import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { getImportBatchReveal } from "@/lib/import-batches";
import { MatchRevenueRevealClient } from "@/components/match-revenue-reveal-client";

export default async function ImportBatchRevealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { orgId } = await requireOrg();
  const { id: batchId } = await params;

  const initialReveal = await getImportBatchReveal(orgId, batchId);
  if (!initialReveal) {
    notFound();
  }

  return <MatchRevenueRevealClient batchId={batchId} initialReveal={initialReveal} />;
}
