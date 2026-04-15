import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isQuestionType } from "@/lib/questions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (payload.question_text)
      updateData.question_text = payload.question_text;
    if (payload.question_type && isQuestionType(payload.question_type))
      updateData.question_type = payload.question_type;
    if (payload.field_name !== undefined)
      updateData.field_name = payload.field_name;
    if (payload.helper_text !== undefined)
      updateData.helper_text = payload.helper_text;
    if (payload.placeholder !== undefined)
      updateData.placeholder = payload.placeholder;
    if (payload.options !== undefined) updateData.options = payload.options;
    if (typeof payload.is_active === "boolean")
      updateData.is_active = payload.is_active;
    if (typeof payload.display_order === "number")
      updateData.display_order = payload.display_order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    const { data, error } = await supabase
      .from("intake_questions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update question", error);
      return NextResponse.json(
        { error: "Failed to update question" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Questions PATCH route error", { message });
    return NextResponse.json(
      { error: "Failed to update question" },
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
      .from("intake_questions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Failed to delete question", error);
      return NextResponse.json(
        { error: "Failed to delete question" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Questions DELETE route error", { message });
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 },
    );
  }
}
