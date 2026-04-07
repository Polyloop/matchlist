import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerPipelineStage } from "@/lib/cronlet/pipeline";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the approved messages with their prospect IDs
    const { data: messages, error } = await supabase
      .from("outreach_messages")
      .select("id, prospect_id")
      .eq("org_id", orgId)
      .eq("status", "approved")
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger send for each message's prospect
    let triggered = 0;
    for (const msg of messages ?? []) {
      try {
        await triggerPipelineStage("send", msg.prospect_id, orgId, {
          stopAfter: "send",
        });
        triggered++;
      } catch {
        // Continue with remaining messages on individual failure
      }
    }

    return NextResponse.json({ triggered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
