import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv, supabasePublishableKey, supabaseUrl } from "./env";

export function createClient() {
  assertSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
