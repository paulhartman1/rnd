import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch active questions
    const { data: questions, error: questionsError } = await supabase
      .from("intake_questions")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    if (questionsError) {
      console.error("Failed to fetch questions", questionsError);
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 },
      );
    }

    // Fetch active mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from("question_mappings")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("priority", { ascending: false });

    if (mappingsError) {
      console.error("Failed to fetch question mappings", mappingsError);
      return NextResponse.json(
        { error: "Failed to fetch question mappings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      questions,
      mappings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Questions route error", { message });
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}
