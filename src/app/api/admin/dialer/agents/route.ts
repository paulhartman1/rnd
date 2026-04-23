import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await isFeatureEnabled("autodialer", user.email);
  if (!hasAccess) {
    return NextResponse.json({ error: "Feature not available" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Get all users from auth.users and join with their agent settings
  const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Get all agent settings
  const { data: agentSettings, error: settingsError } = await adminClient
    .from("dialer_agent_settings")
    .select("*");

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  // Combine users with their settings
  const agents = users.users.map((u) => {
    const settings = agentSettings?.find((s) => s.user_id === u.id);
    return {
      user_id: u.id,
      email: u.email,
      phone_number: settings?.phone_number || null,
      is_active: settings?.is_active || false,
      max_concurrent_calls: settings?.max_concurrent_calls || 1,
      has_settings: !!settings,
      created_at: u.created_at,
    };
  });

  return NextResponse.json({ agents });
}
