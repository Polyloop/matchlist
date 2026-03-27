import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt, maskApiKey } from "@/lib/crypto";

const ALLOWED_KEYS = [
  "org_name",
  "PROXYCURL_API_KEY",
  "BRIGHT_DATA_API_KEY",
  "DOUBLE_THE_DONATION_API_KEY",
  "ANTHROPIC_API_KEY",
];

const SECRET_KEYS = [
  "PROXYCURL_API_KEY",
  "BRIGHT_DATA_API_KEY",
  "DOUBLE_THE_DONATION_API_KEY",
  "ANTHROPIC_API_KEY",
];

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    const supabase = createAdminClient();

    const { data: settings } = await supabase
      .from("org_settings")
      .select("key, value")
      .eq("org_id", orgId);

    // Decrypt and mask secret values for display
    const result: Record<string, string> = {};
    for (const setting of settings ?? []) {
      if (SECRET_KEYS.includes(setting.key)) {
        try {
          const decrypted = decrypt(setting.value);
          result[setting.key] = maskApiKey(decrypted);
        } catch {
          result[setting.key] = "••••••••";
        }
      } else {
        result[setting.key] = setting.value;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { orgId } = await requireOrg();
    const body = await request.json();
    const supabase = createAdminClient();

    const updates: Array<{ org_id: string; key: string; value: string }> = [];

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      if (typeof value !== "string" || !value.trim()) continue;

      // Don't update if value is masked (unchanged)
      if ((value as string).includes("••••")) continue;

      const storedValue = SECRET_KEYS.includes(key)
        ? encrypt(value as string)
        : (value as string);

      updates.push({ org_id: orgId, key, value: storedValue });
    }

    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from("org_settings")
          .upsert(update, { onConflict: "org_id,key" });
      }
    }

    // Also update org name if provided
    if (body.org_name && !body.org_name.includes("••••")) {
      await supabase
        .from("organizations")
        .update({ name: body.org_name, updated_at: new Date().toISOString() })
        .eq("id", orgId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
