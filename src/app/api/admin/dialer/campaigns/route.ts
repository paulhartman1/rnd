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

  const { data: campaigns, error } = await adminClient
    .from("dialer_campaigns")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
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
  const { name, description, lead_filters, priority } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: campaign, error } = await adminClient
    .from("dialer_campaigns")
    .insert({
      name,
      description: description || null,
      lead_filters: lead_filters || {},
      priority: priority || 0,
      is_active: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
