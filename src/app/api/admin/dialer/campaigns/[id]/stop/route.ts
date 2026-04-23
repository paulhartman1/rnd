import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

type Params = {
  id: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
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

  // Deactivate campaign
  const { error } = await adminClient
    .from("dialer_campaigns")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Campaign stopped" });
}
