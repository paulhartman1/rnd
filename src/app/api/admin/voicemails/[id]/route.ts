import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const adminClient = createAdminClient();
  const supabase = adminClient ?? (await createClient());

  const updateData: Record<string, unknown> = {};
  if (typeof body.is_read === "boolean") updateData.is_read = body.is_read;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("voicemails")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update voicemail:", error);
    return NextResponse.json(
      { error: "Failed to update voicemail" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const adminClient = createAdminClient();
  const supabase = adminClient ?? (await createClient());

  const { error } = await supabase.from("voicemails").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete voicemail:", error);
    return NextResponse.json(
      { error: "Failed to delete voicemail" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
