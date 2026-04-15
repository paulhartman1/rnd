export const questionTypes = ["choice", "text", "address", "contact"] as const;

export type QuestionType = (typeof questionTypes)[number];

export type IntakeQuestion = {
  id: string;
  field_name: string | null;
  question_type: QuestionType;
  question_text: string;
  helper_text: string | null;
  placeholder: string | null;
  options: string[] | null;
  is_active: boolean;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionMapping = {
  id: string;
  from_question_id: string;
  answer_value: string | null;
  to_question_id: string | null;
  redirect_url: string | null;
  priority: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionMappingWithDetails = QuestionMapping & {
  from_question?: IntakeQuestion;
  to_question?: IntakeQuestion;
};

export type QuestionInsert = {
  field_name?: string;
  question_type: QuestionType;
  question_text: string;
  helper_text?: string;
  placeholder?: string;
  options?: string[];
  is_active?: boolean;
  display_order: number;
};

export type MappingInsert = {
  from_question_id: string;
  answer_value?: string;
  to_question_id?: string;
  redirect_url?: string;
  priority?: number;
  is_active?: boolean;
};

/**
 * Find the next question based on current question and answer
 * Returns the next question ID, redirect URL, or null if this is the end
 */
export function findNextStep(
  currentQuestionId: string,
  answer: string,
  mappings: QuestionMapping[],
): { nextQuestionId: string | null; redirectUrl: string | null } {
  // Filter active mappings for current question, sorted by priority (highest first)
  const relevantMappings = mappings
    .filter(
      (m) =>
        m.from_question_id === currentQuestionId &&
        m.is_active &&
        !m.deleted_at,
    )
    .sort((a, b) => b.priority - a.priority);

  // First, look for exact answer match
  const exactMatch = relevantMappings.find((m) => m.answer_value === answer);
  if (exactMatch) {
    return {
      nextQuestionId: exactMatch.to_question_id,
      redirectUrl: exactMatch.redirect_url,
    };
  }

  // Then, look for default mapping (null answer_value)
  const defaultMapping = relevantMappings.find((m) => m.answer_value === null);
  if (defaultMapping) {
    return {
      nextQuestionId: defaultMapping.to_question_id,
      redirectUrl: defaultMapping.redirect_url,
    };
  }

  // No mapping found - end of flow
  return { nextQuestionId: null, redirectUrl: null };
}

/**
 * Get the first question in the flow (lowest display_order, active, not deleted)
 */
export function getFirstQuestion(
  questions: IntakeQuestion[],
): IntakeQuestion | null {
  const activeQuestions = questions
    .filter((q) => q.is_active && !q.deleted_at)
    .sort((a, b) => a.display_order - b.display_order);

  return activeQuestions[0] ?? null;
}

/**
 * Validate that a question type is valid
 */
export function isQuestionType(value: unknown): value is QuestionType {
  return (
    typeof value === "string" && questionTypes.includes(value as QuestionType)
  );
}
