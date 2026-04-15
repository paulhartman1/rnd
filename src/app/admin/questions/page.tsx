import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { IntakeQuestion, QuestionMappingWithDetails } from "@/lib/questions";
import AdminNav from "../admin-nav";
import QuestionsClient from "./questions-client";

export default async function AdminQuestionsPage() {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Supabase is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to continue.
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  // Fetch questions
  const { data: questionsData, error: questionsError } = await queryClient
    .from("intake_questions")
    .select("*")
    .order("display_order", { ascending: true });

  // Fetch mappings with related questions
  const { data: mappingsData, error: mappingsError } = await queryClient
    .from("question_mappings")
    .select(
      `
      *,
      from_question:intake_questions!from_question_id(*),
      to_question:intake_questions!to_question_id(*)
    `,
    )
    .order("priority", { ascending: false });

  const questions = (questionsData ?? []) as IntakeQuestion[];
  const mappings = (mappingsData ?? []) as QuestionMappingWithDetails[];

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Question Management
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Intake Questions & Flow
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Configure the questions and flow logic for the cash offer intake form.
          </p>
        </header>

        {questionsError || mappingsError ? (
          <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load questions or mappings. Please check your database configuration.
          </div>
        ) : (
          <QuestionsClient
            initialQuestions={questions}
            initialMappings={mappings}
          />
        )}
      </div>
    </main>
  );
}
