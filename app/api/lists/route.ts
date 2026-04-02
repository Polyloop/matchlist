import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    const supabase = createAdminClient();

    // Get lists with prospect counts
    const { data: lists, error } = await supabase
      .from("prospect_lists")
      .select("id, name, created_at")
      .eq("org_id", orgId)
      .eq("type", "segment")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get counts per list
    const listsWithCounts = await Promise.all(
      (lists ?? []).map(async (list) => {
        const { count } = await supabase
          .from("prospect_list_members")
          .select("*", { count: "exact", head: true })
          .eq("list_id", list.id);
        return { ...list, prospect_count: count ?? 0 };
      }),
    );

    return NextResponse.json(listsWithCounts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { orgId } = await requireOrg();
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("prospect_lists")
      .insert({ org_id: orgId, name: name.trim(), type: "segment" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
