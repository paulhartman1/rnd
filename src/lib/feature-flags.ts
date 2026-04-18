import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  allowed_users: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Super admin emails with access to feature flags
 */
const SUPER_ADMINS = [
  'paulhartman.bassist@gmail.com',
  'christie.swoboda@gmail.com'
];

/**
 * Check if a user is a super admin
 */
export function isSuperAdmin(userEmail: string | undefined): boolean {
  if (!userEmail) return false;
  return SUPER_ADMINS.includes(userEmail.toLowerCase());
}

/**
 * Check if a feature flag is enabled for a specific user
 * @param flagKey - The unique key for the feature flag
 * @param userEmail - The email of the user to check (optional)
 * @returns true if the feature is enabled and the user has access, false otherwise
 */
export async function isFeatureEnabled(
  flagKey: string,
  userEmail?: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error("Feature flags: Admin client not available");
      return false;
    }

    const { data: flag, error } = await adminClient
      .from("feature_flags")
      .select("*")
      .eq("flag_key", flagKey)
      .single();

    if (error || !flag) {
      console.error(`Feature flag ${flagKey} not found:`, error);
      return false;
    }

    // If flag is disabled, return false
    if (!flag.is_enabled) {
      return false;
    }

    // If no user email provided, only check if flag is globally enabled
    if (!userEmail) {
      return flag.is_enabled;
    }

    // If flag has allowed_users, check if user is in the list
    if (flag.allowed_users && flag.allowed_users.length > 0) {
      return flag.allowed_users.includes(userEmail.toLowerCase());
    }

    // If no allowed_users restriction, flag is enabled for everyone
    return true;
  } catch (error) {
    console.error(`Error checking feature flag ${flagKey}:`, error);
    return false;
  }
}

/**
 * Get all feature flags (only accessible to super admins)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isSuperAdmin(user.email)) {
      return [];
    }

    const { data: flags, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("flag_name", { ascending: true });

    if (error) {
      console.error("Error fetching feature flags:", error);
      return [];
    }

    return flags as FeatureFlag[];
  } catch (error) {
    console.error("Error in getAllFeatureFlags:", error);
    return [];
  }
}
