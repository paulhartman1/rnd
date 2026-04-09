import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseEnv, supabasePublishableKey, supabaseUrl } from "./env";

export async function createClient() {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignored when called from contexts where mutating cookies is not supported.
        }
      },
    },
  });
}
