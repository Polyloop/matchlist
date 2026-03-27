import { requireOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const { orgId, clerkOrgId } = await requireOrg();
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm orgName={org?.name || ""} clerkOrgId={clerkOrgId} />
    </div>
  );
}
