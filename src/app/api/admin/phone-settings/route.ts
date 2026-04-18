import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("phone_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    return NextResponse.json({ error: "Failed to fetch phone settings" }, { status: 500 });
  }

  return NextResponse.json({ phoneSettings: data });
}

export async function PATCH(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const body = await request.json();
  const { forward_to_number, is_forwarding_enabled, voicemail_message } = body;

  // Get existing settings (should only be one row)
  const { data: existing } = await supabase
    .from("phone_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const updateData: Record<string, any> = {};
  if (forward_to_number !== undefined) updateData.forward_to_number = forward_to_number;
  if (is_forwarding_enabled !== undefined) updateData.is_forwarding_enabled = is_forwarding_enabled;
  if (voicemail_message !== undefined) updateData.voicemail_message = voicemail_message;
  if (body.voicemail_voice !== undefined) updateData.voicemail_voice = body.voicemail_voice;

  if (existing) {
    // Update the single existing row
    const { data, error } = await supabase
      .from("phone_settings")
      .update(updateData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update phone settings:", error);
      return NextResponse.json({ error: "Failed to update phone settings" }, { status: 500 });
    }

    return NextResponse.json(data);
  } else {
    // Create the first (and only) row
    const { data, error } = await supabase
      .from("phone_settings")
      .insert(updateData)
      .select()
      .single();

    if (error) {
      console.error("Failed to create phone settings:", error);
      return NextResponse.json({ error: "Failed to create phone settings" }, { status: 500 });
    }

    return NextResponse.json(data);
  }
}
