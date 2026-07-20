import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sourceId } = await params;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { key_hash, name } = body;

    if (!key_hash || !name) {
      return NextResponse.json(
        { error: "key_hash and name are required" },
        { status: 400 }
      );
    }

    // Verify the source exists
    const { data: source } = await supabase
      .from("sources")
      .select("id")
      .eq("id", sourceId)
      .single();

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Insert the new API key
    const { data: newKey, error } = await supabase
      .from("source_api_keys")
      .insert({
        source_id: sourceId,
        key_hash,
        name,
        active: true,
      })
      .select("id, name, created_at, last_used_at, active")
      .single();

    if (error) {
      console.error("Error creating API key:", error);
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 }
      );
    }

    return NextResponse.json(newKey);
  } catch (error) {
    console.error("Error in POST /api/admin/sources/[id]/api-keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
