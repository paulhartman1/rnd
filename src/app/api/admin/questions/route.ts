import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isQuestionType, type QuestionInsert } from "@/lib/questions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    let query = supabase
      .from("intake_questions")
      .select("*")
      .order("display_order", { ascending: true });

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch questions", error);
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Questions GET route error", { message });
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Validate required fields
    if (!payload.question_text || typeof payload.question_text !== "string") {
      return NextResponse.json(
        { error: "question_text is required" },
        { status: 400 },
      );
    }

    if (!isQuestionType(payload.question_type)) {
      return NextResponse.json(
        { error: "Invalid question_type" },
        { status: 400 },
      );
    }

    if (
      payload.display_order === undefined ||
      typeof payload.display_order !== "number"
    ) {
      return NextResponse.json(
        { error: "display_order is required" },
        { status: 400 },
      );
    }

    const insertData: QuestionInsert = {
      question_type: payload.question_type,
      question_text: payload.question_text,
      display_order: payload.display_order,
    };

    if (payload.field_name) insertData.field_name = payload.field_name;
    if (payload.helper_text) insertData.helper_text = payload.helper_text;
    if (payload.placeholder) insertData.placeholder = payload.placeholder;
    if (payload.options && Array.isArray(payload.options))
      insertData.options = payload.options;
    if (typeof payload.is_active === "boolean")
      insertData.is_active = payload.is_active;

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    const { data, error } = await supabase
      .from("intake_questions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Failed to create question", error);
      return NextResponse.json(
        { error: "Failed to create question" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Questions POST route error", { message });
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 },
    );
  }
}
