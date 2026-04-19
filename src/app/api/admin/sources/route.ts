import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch sources:", error);
    return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const body = await request.json();
  const { name, description, is_active } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Source name is required" }, { status: 400 });
  }

  // Check if name already exists
  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("name", name.trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Source name already exists" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("sources")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create source:", error);
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }

  return NextResponse.json(data);
}
