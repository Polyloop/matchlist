import { createClient } from "@supabase/supabase-js";

// NOTE: Run `supabase gen types` to generate proper Database types,
// then add the generic parameter here for full type safety.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
