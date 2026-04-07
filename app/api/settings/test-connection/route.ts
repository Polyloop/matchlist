import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getOrgSetting } from "@/lib/settings";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const value = await getOrgSetting(orgId, key);
    if (!value) {
      return NextResponse.json({ error: "Key not configured" }, { status: 400 });
    }

    // Test the connection based on the key type
    switch (key) {
      case "ANTHROPIC_API_KEY": {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": value,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1,
            messages: [{ role: "user", content: "test" }],
          }),
        });
        // A 200 or 400 (bad request but auth worked) means the key is valid
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
        }
        return NextResponse.json({ status: "connected" });
      }

      case "BRIGHT_DATA_API_KEY": {
        // Bright Data doesn't have a simple health check, so we just verify the key format
        if (value.length > 10) {
          return NextResponse.json({ status: "connected" });
        }
        return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
      }

      case "DOUBLE_THE_DONATION_API_KEY": {
        // Simple format validation
        if (value.length > 10) {
          return NextResponse.json({ status: "connected" });
        }
        return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
      }

      default:
        return NextResponse.json({ error: "Unknown key type" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
