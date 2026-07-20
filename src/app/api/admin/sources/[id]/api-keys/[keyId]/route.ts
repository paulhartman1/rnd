import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const { id: sourceId, keyId } = await params;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { active } = body;

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "active must be a boolean" },
        { status: 400 }
      );
    }

    // Update the key
    const { data: updatedKey, error } = await supabase
      .from("source_api_keys")
      .update({ active })
      .eq("id", keyId)
      .eq("source_id", sourceId)
      .select("id, name, created_at, last_used_at, active")
      .single();

    if (error) {
      console.error("Error updating API key:", error);
      return NextResponse.json(
        { error: "Failed to update API key" },
        { status: 500 }
      );
    }

    if (!updatedKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json(updatedKey);
  } catch (error) {
    console.error("Error in PATCH /api/admin/sources/[id]/api-keys/[keyId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const { id: sourceId, keyId } = await params;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the key
    const { error } = await supabase
      .from("source_api_keys")
      .delete()
      .eq("id", keyId)
      .eq("source_id", sourceId);

    if (error) {
      console.error("Error deleting API key:", error);
      return NextResponse.json(
        { error: "Failed to delete API key" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/sources/[id]/api-keys/[keyId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
