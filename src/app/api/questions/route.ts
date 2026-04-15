import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Use admin client to bypass RLS for public questions endpoint
    const adminClient = createAdminClient();
    const supabase = adminClient ?? (await createClient());
    console.log('[API] Supabase client created');

    // Fetch active questions
    const { data: questions, error: questionsError } = await supabase
      .from("intake_questions")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    console.log('[API] Questions query result:', { questions, questionsError });
    console.log('[API] Questions count:', questions?.length || 0);

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

    console.log('[API] Mappings query result:', { mappings, mappingsError });
    console.log('[API] Mappings count:', mappings?.length || 0);

    if (mappingsError) {
      console.error("Failed to fetch question mappings", mappingsError);
      return NextResponse.json(
        { error: "Failed to fetch question mappings" },
        { status: 500 },
      );
    }

    console.log('[API] Returning response with', questions?.length, 'questions and', mappings?.length, 'mappings');

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
