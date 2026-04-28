import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    let query = adminClient
      .from("leads")
      .select("id, full_name, phone, street_address, status")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Add search if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,street_address.ilike.%${search}%`);
    }

    const { data: leads, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: leads || [] });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
