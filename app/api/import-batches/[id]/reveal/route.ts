import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getImportBatchReveal } from "@/lib/import-batches";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: batchId } = await params;

    const reveal = await getImportBatchReveal(orgId, batchId);
    if (!reveal) {
      return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
    }

    return NextResponse.json(reveal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
