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

export type ConditionalOperator = "equals" | "not_equals" | "contains" | "not_contains";

export type Condition = {
  question_id: string;
  answer_value: string;
  operator: ConditionalOperator;
};

export type ConditionalLogic = {
  operator: "AND" | "OR";
  conditions: Condition[];
};

export type QuestionMapping = {
  id: string;
  from_question_id: string;
  answer_value: string | null;
  to_question_id: string | null;
  redirect_url: string | null;
  priority: number;
  is_active: boolean;
  conditional_logic: ConditionalLogic | null;
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
  conditional_logic?: ConditionalLogic;
};

/**
 * Evaluate a single condition against previous answers
 */
function evaluateCondition(
  condition: Condition,
  previousAnswers: Record<string, string>,
): boolean {
  const answer = previousAnswers[condition.question_id];
  if (!answer) return false;

  switch (condition.operator) {
    case "equals":
      return answer === condition.answer_value;
    case "not_equals":
      return answer !== condition.answer_value;
    case "contains":
      return answer.toLowerCase().includes(condition.answer_value.toLowerCase());
    case "not_contains":
      return !answer.toLowerCase().includes(condition.answer_value.toLowerCase());
    default:
      return false;
  }
}

/**
 * Evaluate conditional logic against previous answers
 */
function evaluateConditionalLogic(
  logic: ConditionalLogic | null,
  previousAnswers: Record<string, string>,
): boolean {
  if (!logic || !logic.conditions || logic.conditions.length === 0) {
    return true; // No conditions means always pass
  }

  const results = logic.conditions.map((condition) =>
    evaluateCondition(condition, previousAnswers)
  );

  if (logic.operator === "AND") {
    return results.every((r) => r === true);
  } else {
    // OR
    return results.some((r) => r === true);
  }
}

/**
 * Find the next question based on current question, answer, and previous answers
 * Returns the next question ID, redirect URL, or null if this is the end
 */
export function findNextStep(
  currentQuestionId: string,
  answer: string,
  mappings: QuestionMapping[],
  previousAnswers: Record<string, string> = {},
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

  // First, look for exact answer match with conditional logic satisfied
  for (const mapping of relevantMappings) {
    if (mapping.answer_value === answer) {
      // Check conditional logic if present
      if (evaluateConditionalLogic(mapping.conditional_logic, previousAnswers)) {
        return {
          nextQuestionId: mapping.to_question_id,
          redirectUrl: mapping.redirect_url,
        };
      }
    }
  }

  // Then, look for default mapping (null answer_value) with conditional logic satisfied
  for (const mapping of relevantMappings) {
    if (mapping.answer_value === null) {
      if (evaluateConditionalLogic(mapping.conditional_logic, previousAnswers)) {
        return {
          nextQuestionId: mapping.to_question_id,
          redirectUrl: mapping.redirect_url,
        };
      }
    }
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
