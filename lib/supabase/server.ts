import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export async function createServerClient() {
  const { getToken, orgId } = await auth();
  const supabaseToken = await getToken({ template: "supabase" });

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
      },
    },
  );

  return { client, orgId };
}
