import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, description, is_active } = body;

  const updateData: Record<string, any> = {};
  
  if (name !== undefined) {
    if (!name.trim()) {
      return NextResponse.json({ error: "Source name cannot be empty" }, { status: 400 });
    }
    
    // Check if new name conflicts with existing sources
    const { data: existing } = await supabase
      .from("sources")
      .select("id")
      .eq("name", name.trim())
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Source name already exists" }, { status: 409 });
    }
    
    updateData.name = name.trim();
  }
  
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data, error } = await supabase
    .from("sources")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update source:", error);
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { id } = await params;

  // Check if source is in use by any leads
  const { count, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("source_id", id);

  if (countError) {
    console.error("Failed to check source usage:", countError);
    return NextResponse.json({ error: "Failed to check source usage" }, { status: 500 });
  }

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete source. It is being used by ${count} lead(s).` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("sources")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete source:", error);
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
