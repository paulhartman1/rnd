import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (payload.from_question_id !== undefined)
      updateData.from_question_id = payload.from_question_id;
    if (payload.answer_value !== undefined)
      updateData.answer_value = payload.answer_value;
    if (payload.to_question_id !== undefined)
      updateData.to_question_id = payload.to_question_id;
    if (payload.redirect_url !== undefined)
      updateData.redirect_url = payload.redirect_url;
    if (typeof payload.priority === "number")
      updateData.priority = payload.priority;
    if (typeof payload.is_active === "boolean")
      updateData.is_active = payload.is_active;
    if (payload.conditional_logic !== undefined)
      updateData.conditional_logic = payload.conditional_logic;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    const { data, error } = await supabase
      .from("question_mappings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update question mapping", error);
      return NextResponse.json(
        { error: "Failed to update question mapping" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Question mappings PATCH route error", { message });
    return NextResponse.json(
      { error: "Failed to update question mapping" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from("question_mappings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Failed to delete question mapping", error);
      return NextResponse.json(
        { error: "Failed to delete question mapping" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Question mappings DELETE route error", { message });
    return NextResponse.json(
      { error: "Failed to delete question mapping" },
      { status: 500 },
    );
  }
}
