import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireOrg() {
  const { orgId, userId } = await auth();
  if (!orgId) throw new Error("Organization required");
  if (!userId) throw new Error("Authentication required");

  const supabase = createAdminClient();

  // Upsert org record so it exists on first access
  const { data: org, error } = await supabase
    .from("organizations")
    .upsert(
      { clerk_org_id: orgId, name: orgId },
      { onConflict: "clerk_org_id" },
    )
    .select("id")
    .single();

  if (error || !org) throw new Error("Failed to resolve organization");

  return { orgId: org.id, clerkOrgId: orgId, userId };
}
