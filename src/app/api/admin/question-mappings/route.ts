import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MappingInsert } from "@/lib/questions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    let query = supabase
      .from("question_mappings")
      .select(
        `
        *,
        from_question:intake_questions!from_question_id(*),
        to_question:intake_questions!to_question_id(*)
      `,
      )
      .order("priority", { ascending: false });

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch question mappings", error);
      return NextResponse.json(
        { error: "Failed to fetch question mappings" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Question mappings GET route error", { message });
    return NextResponse.json(
      { error: "Failed to fetch question mappings" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Validate required fields
    if (!payload.from_question_id) {
      return NextResponse.json(
        { error: "from_question_id is required" },
        { status: 400 },
      );
    }

    const insertData: MappingInsert = {
      from_question_id: payload.from_question_id,
    };

    if (payload.answer_value !== undefined)
      insertData.answer_value = payload.answer_value;
    if (payload.to_question_id !== undefined)
      insertData.to_question_id = payload.to_question_id;
    if (payload.redirect_url !== undefined)
      insertData.redirect_url = payload.redirect_url;
    if (typeof payload.priority === "number")
      insertData.priority = payload.priority;
    if (typeof payload.is_active === "boolean")
      insertData.is_active = payload.is_active;

    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());

    const { data, error } = await supabase
      .from("question_mappings")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Failed to create question mapping", error);
      return NextResponse.json(
        { error: "Failed to create question mapping" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Question mappings POST route error", { message });
    return NextResponse.json(
      { error: "Failed to create question mapping" },
      { status: 500 },
    );
  }
}
