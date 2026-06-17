import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const userSupabase = await createClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { isPWA } = body;

    if (typeof isPWA !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request: isPWA must be boolean" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const timestampField = isPWA ? "last_pwa_use_at" : "last_web_use_at";
    const counterField = isPWA ? "pwa_session_count" : "web_session_count";

    // Check if user activity record exists
    const { data: existing } = await supabase
      .from("user_activity")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("user_activity")
        .update({
          [timestampField]: now,
          [counterField]: (existing[counterField] || 0) + 1,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Failed to update activity:", updateError);
        return NextResponse.json(
          { error: "Failed to update activity" },
          { status: 500 },
        );
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from("user_activity")
        .insert({
          user_id: user.id,
          [timestampField]: now,
          [counterField]: 1,
        });

      if (insertError) {
        console.error("Failed to create activity record:", insertError);
        return NextResponse.json(
          { error: "Failed to create activity record" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, isPWA });
  } catch (err) {
    console.error("Session tracking error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
