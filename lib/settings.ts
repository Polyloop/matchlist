import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";

/**
 * Get an org-level setting value. Falls back to env var if not stored in DB.
 */
export async function getOrgSetting(
  orgId: string,
  key: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("org_settings")
    .select("value")
    .eq("org_id", orgId)
    .eq("key", key)
    .single();

  if (data?.value) {
    try {
      return decrypt(data.value);
    } catch {
      return data.value;
    }
  }

  // Fallback to env var
  return process.env[key] ?? null;
}
