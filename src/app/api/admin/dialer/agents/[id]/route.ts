import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

type Params = {
  id: string; // user_id
};

// Update or create agent settings for a user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id: userId } = await params;
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

  const body = await request.json();
  const { phone_number, is_active, max_concurrent_calls } = body;

  const updateData: Record<string, unknown> = {};
  if (phone_number !== undefined) updateData.phone_number = phone_number;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (max_concurrent_calls !== undefined) updateData.max_concurrent_calls = max_concurrent_calls;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Upsert agent settings
  const { data: settings, error } = await adminClient
    .from("dialer_agent_settings")
    .upsert(
      { user_id: userId, ...updateData },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings });
}
