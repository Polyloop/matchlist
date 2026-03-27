import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: listId } = await params;
    const { prospectIds } = await request.json();

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: "prospectIds array is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify list belongs to org
    const { data: list } = await supabase
      .from("prospect_lists")
      .select("id")
      .eq("id", listId)
      .eq("org_id", orgId)
      .single();

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Verify all prospects belong to org
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id")
      .eq("org_id", orgId)
      .in("id", prospectIds);

    const validIds = new Set((prospects ?? []).map((p) => p.id));

    // Insert memberships (ignore duplicates)
    const memberships = prospectIds
      .filter((id: string) => validIds.has(id))
      .map((prospectId: string) => ({
        prospect_id: prospectId,
        list_id: listId,
      }));

    if (memberships.length > 0) {
      await supabase
        .from("prospect_list_members")
        .upsert(memberships, { onConflict: "prospect_id,list_id" });
    }

    return NextResponse.json({
      added: memberships.length,
      total: prospectIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
