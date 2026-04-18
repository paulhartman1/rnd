import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const adminClient = createAdminClient();
  const supabase = adminClient ?? (await createClient());

  const { data, error } = await supabase
    .from("voicemails")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch voicemails:", error);
    return NextResponse.json(
      { error: "Failed to fetch voicemails" },
      { status: 500 }
    );
  }

  return NextResponse.json({ voicemails: data });
}
