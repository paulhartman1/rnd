"use client";

import { useState } from "react";
import type {
  IntakeQuestion,
  QuestionMappingWithDetails,
  QuestionType,
  ConditionalLogic,
  Condition,
} from "@/lib/questions";

type Props = {
  initialQuestions: IntakeQuestion[];
  initialMappings: QuestionMappingWithDetails[];
};

export default function QuestionsClient({
  initialQuestions,
  initialMappings,
}: Props) {
  const [questions, setQuestions] = useState<IntakeQuestion[]>(initialQuestions);
  const [mappings, setMappings] = useState<QuestionMappingWithDetails[]>(initialMappings);
  const [showDeleted, setShowDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "mappings">("questions");

  // Question editing state
  const [editingQuestion, setEditingQuestion] = useState<IntakeQuestion | null>(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "choice" as QuestionType,
    field_name: "",
    helper_text: "",
    placeholder: "",
    options: [] as string[],
    display_order: questions.length + 1,
    isSaving: false,
    error: null as string | null,
  });

  // Mapping editing state
  const [editingMapping, setEditingMapping] = useState<QuestionMappingWithDetails | null>(null);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    from_question_id: "",
    answer_value: "",
    to_question_id: "",
    redirect_url: "",
    priority: 0,
    conditional_logic: null as ConditionalLogic | null,
    isSaving: false,
    error: null as string | null,
  });

  const visibleQuestions = questions.filter((q) => showDeleted || !q.deleted_at);
  const visibleMappings = mappings.filter((m) => showDeleted || !m.deleted_at);

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: "",
      question_type: "choice",
      field_name: "",
      helper_text: "",
      placeholder: "",
      options: [],
      display_order: questions.length + 1,
      isSaving: false,
      error: null,
    });
    setEditingQuestion(null);
    setIsCreatingQuestion(false);
  };

  const resetMappingForm = () => {
    setMappingForm({
      from_question_id: "",
      answer_value: "",
      to_question_id: "",
      redirect_url: "",
      priority: 0,
      conditional_logic: null,
      isSaving: false,
      error: null,
    });
    setEditingMapping(null);
    setIsCreatingMapping(false);
  };

  const startEditQuestion = (question: IntakeQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      field_name: question.field_name || "",
      helper_text: question.helper_text || "",
      placeholder: question.placeholder || "",
      options: question.options || [],
      display_order: question.display_order,
      isSaving: false,
      error: null,
    });
    setIsCreatingQuestion(false);
  };

  const saveQuestion = async () => {
    setQuestionForm({ ...questionForm, isSaving: true, error: null });

    try {
      const payload = {
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        field_name: questionForm.field_name || null,
        helper_text: questionForm.helper_text || null,
        placeholder: questionForm.placeholder || null,
        options: questionForm.options.length > 0 ? questionForm.options : null,
        display_order: questionForm.display_order,
      };

      if (editingQuestion) {
        // Update existing question
        const response = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to update question");

        const updated = await response.json();
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? updated : q)),
        );
      } else {
        // Create new question
        const response = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create question");

        const created = await response.json();
        setQuestions((prev) => [...prev, created]);
      }

      resetQuestionForm();
    } catch (error) {
      setQuestionForm({
        ...questionForm,
        isSaving: false,
        error: error instanceof Error ? error.message : "Failed to save question",
      });
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete question");

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, deleted_at: new Date().toISOString() } : q,
        ),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete question");
    }
  };

  const startEditMapping = (mapping: QuestionMappingWithDetails) => {
    setEditingMapping(mapping);
    setMappingForm({
      from_question_id: mapping.from_question_id,
      answer_value: mapping.answer_value || "",
      to_question_id: mapping.to_question_id || "",
      redirect_url: mapping.redirect_url || "",
      priority: mapping.priority,
      conditional_logic: mapping.conditional_logic || null,
      isSaving: false,
      error: null,
    });
    setIsCreatingMapping(false);
  };

  const saveMapping = async () => {
    setMappingForm({ ...mappingForm, isSaving: true, error: null });

    try {
      const payload = {
        from_question_id: mappingForm.from_question_id,
        answer_value: mappingForm.answer_value || null,
        to_question_id: mappingForm.to_question_id || null,
        redirect_url: mappingForm.redirect_url || null,
        priority: mappingForm.priority,
        conditional_logic: mappingForm.conditional_logic || null,
      };

      if (editingMapping) {
        // Update existing mapping
        const response = await fetch(`/api/admin/question-mappings/${editingMapping.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to update mapping");

        const updated = await response.json();
        setMappings((prev) =>
          prev.map((m) => (m.id === editingMapping.id ? updated : m)),
        );
      } else {
        // Create new mapping
        const response = await fetch("/api/admin/question-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create mapping");

        const created = await response.json();
        setMappings((prev) => [...prev, created]);
      }

      resetMappingForm();
    } catch (error) {
      setMappingForm({
        ...mappingForm,
        isSaving: false,
        error: error instanceof Error ? error.message : "Failed to save mapping",
      });
    }
  };

  const deleteMapping = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mapping?")) return;

    try {
      const response = await fetch(`/api/admin/question-mappings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete mapping");

      setMappings((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m,
        ),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete mapping");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-black/8 bg-white p-1">
        <button
          onClick={() => setActiveTab("questions")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition ${
            activeTab === "questions"
              ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:bg-black/5"
          }`}
        >
          Questions
        </button>
        <button
          onClick={() => setActiveTab("mappings")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition ${
            activeTab === "mappings"
              ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)]"
              : "text-[var(--color-muted)] hover:bg-black/5"
          }`}
        >
          Flow Mappings
        </button>
      </div>

      {/* Show deleted toggle */}
      <label className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-4 py-3">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(e) => setShowDeleted(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary-gold)]"
        />
        <span className="text-sm font-semibold text-[var(--color-navy)]">
          Show deleted items
        </span>
      </label>

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[var(--color-navy)]">
              Questions ({visibleQuestions.length})
            </h2>
            <button
              onClick={() => {
                resetQuestionForm();
                setIsCreatingQuestion(true);
              }}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
            >
              + Add Question
            </button>
          </div>

          {(isCreatingQuestion || editingQuestion) && (
            <div className="rounded-xl border border-black/8 bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-bold text-[var(--color-navy)]">
                {editingQuestion ? "Edit Question" : "Create Question"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    Question Text *
                  </label>
                  <input
                    type="text"
                    value={questionForm.question_text}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, question_text: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-muted)]">
                      Type *
                    </label>
                    <select
                      value={questionForm.question_type}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          question_type: e.target.value as QuestionType,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                    >
                      <option value="choice">Choice</option>
                      <option value="text">Text</option>
                      <option value="address">Address</option>
                      <option value="contact">Contact</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-muted)]">
                      Field Name
                    </label>
                    <input
                      type="text"
                      value={questionForm.field_name}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, field_name: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    Helper Text
                  </label>
                  <input
                    type="text"
                    value={questionForm.helper_text}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, helper_text: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </div>

                {questionForm.question_type === "choice" && (
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-muted)]">
                      Options (one per line)
                    </label>
                    <textarea
                      value={questionForm.options.join("\n")}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          options: e.target.value.split("\n"),
                        })
                      }
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    Display Order *
                  </label>
                  <input
                    type="number"
                    value={questionForm.display_order}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </div>

                {questionForm.error && (
                  <p className="text-sm text-red-600">{questionForm.error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveQuestion}
                    disabled={questionForm.isSaving || !questionForm.question_text}
                    className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:opacity-50"
                  >
                    {questionForm.isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={resetQuestionForm}
                    className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {visibleQuestions.map((question) => (
              <div
                key={question.id}
                className={`rounded-xl border border-black/8 bg-white p-4 ${
                  question.deleted_at ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--color-surface-soft)] px-2 py-1 text-xs font-bold text-[var(--color-navy)]">
                        #{question.display_order}
                      </span>
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                        {question.question_type}
                      </span>
                      {question.field_name && (
                        <span className="text-xs text-[var(--color-muted)]">
                          ({question.field_name})
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-[var(--color-navy)]">
                      {question.question_text}
                    </p>
                    {question.helper_text && (
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {question.helper_text}
                      </p>
                    )}
                    {question.options && question.options.length > 0 && (
                      <p className="mt-2 text-xs text-[var(--color-muted)]">
                        Options: {question.options.join(", ")}
                      </p>
                    )}
                  </div>
                  {!question.deleted_at && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditQuestion(question)}
                        className="rounded bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="rounded bg-red-50 px-3 py-1 text-xs font-bold text-red-700 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mappings Tab */}
      {activeTab === "mappings" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[var(--color-navy)]">
              Flow Mappings ({visibleMappings.length})
            </h2>
            <button
              onClick={() => {
                resetMappingForm();
                setIsCreatingMapping(true);
              }}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
            >
              + Add Mapping
            </button>
          </div>

          {(isCreatingMapping || editingMapping) && (
            <div className="rounded-xl border border-black/8 bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-bold text-[var(--color-navy)]">
                {editingMapping ? "Edit Mapping" : "Create Mapping"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    From Question *
                  </label>
                  <select
                    value={mappingForm.from_question_id}
                    onChange={(e) =>
                      setMappingForm({ ...mappingForm, from_question_id: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="">Select question...</option>
                    {questions
                      .filter((q) => !q.deleted_at)
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.question_text}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    Answer Value (leave empty for default/"any answer")
                  </label>
                  {(() => {
                    const fromQuestion = questions.find(
                      (q) => q.id === mappingForm.from_question_id
                    );
                    const isChoiceQuestion =
                      fromQuestion?.question_type === "choice" &&
                      fromQuestion?.options &&
                      fromQuestion.options.length > 0;

                    if (isChoiceQuestion && fromQuestion.options) {
                      return (
                        <select
                          value={mappingForm.answer_value}
                          onChange={(e) =>
                            setMappingForm({ ...mappingForm, answer_value: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                        >
                          <option value="">Default (any answer)</option>
                          {fromQuestion.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    return (
                      <input
                        type="text"
                        value={mappingForm.answer_value}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, answer_value: e.target.value })
                        }
                        placeholder="Leave empty for default"
                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    To Question (leave empty to end flow)
                  </label>
                  <select
                    value={mappingForm.to_question_id}
                    onChange={(e) =>
                      setMappingForm({ ...mappingForm, to_question_id: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="">End of flow / Submit</option>
                    {questions
                      .filter((q) => !q.deleted_at)
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.question_text}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    Redirect URL (optional, instead of next question)
                  </label>
                  <input
                    type="text"
                    value={mappingForm.redirect_url}
                    onChange={(e) =>
                      setMappingForm({ ...mappingForm, redirect_url: e.target.value })
                    }
                    placeholder="/get-cash-offer/bye-felicia"
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-muted)]">
                    Priority (higher = evaluated first)
                  </label>
                  <input
                    type="number"
                    value={mappingForm.priority}
                    onChange={(e) =>
                      setMappingForm({
                        ...mappingForm,
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </div>

                {/* Conditional Logic Section */}
                <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-purple-900">
                      Conditional Logic (Advanced)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (mappingForm.conditional_logic) {
                          setMappingForm({ ...mappingForm, conditional_logic: null });
                        } else {
                          setMappingForm({
                            ...mappingForm,
                            conditional_logic: {
                              operator: "AND",
                              conditions: [{ question_id: "", answer_value: "", operator: "equals" }],
                            },
                          });
                        }
                      }}
                      className="rounded bg-purple-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-purple-800"
                    >
                      {mappingForm.conditional_logic ? "Remove" : "Add Conditions"}
                    </button>
                  </div>
                  <p className="text-xs text-purple-700">
                    Check answers from ANY previous question to control flow
                  </p>

                  {mappingForm.conditional_logic && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-purple-900">
                          Logic Operator
                        </label>
                        <select
                          value={mappingForm.conditional_logic.operator}
                          onChange={(e) =>
                            setMappingForm({
                              ...mappingForm,
                              conditional_logic: {
                                ...mappingForm.conditional_logic!,
                                operator: e.target.value as "AND" | "OR",
                              },
                            })
                          }
                          className="mt-1 w-full rounded border border-purple-300 px-2 py-1 text-sm"
                        >
                          <option value="AND">AND (all conditions must match)</option>
                          <option value="OR">OR (any condition can match)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        {mappingForm.conditional_logic.conditions.map((condition, idx) => (
                          <div key={idx} className="rounded border border-purple-300 bg-white p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-900">
                                Condition {idx + 1}
                              </span>
                              {mappingForm.conditional_logic!.conditions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newConditions = mappingForm.conditional_logic!.conditions.filter(
                                      (_, i) => i !== idx
                                    );
                                    setMappingForm({
                                      ...mappingForm,
                                      conditional_logic: {
                                        ...mappingForm.conditional_logic!,
                                        conditions: newConditions,
                                      },
                                    });
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700">
                                Previous Question
                              </label>
                              <select
                                value={condition.question_id}
                                onChange={(e) => {
                                  const newConditions = [...mappingForm.conditional_logic!.conditions];
                                  newConditions[idx] = { ...condition, question_id: e.target.value };
                                  setMappingForm({
                                    ...mappingForm,
                                    conditional_logic: {
                                      ...mappingForm.conditional_logic!,
                                      conditions: newConditions,
                                    },
                                  });
                                }}
                                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                              >
                                <option value="">Select question...</option>
                                {questions
                                  .filter((q) => !q.deleted_at)
                                  .map((q) => (
                                    <option key={q.id} value={q.id}>
                                      {q.question_text}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700">
                                Operator
                              </label>
                              <select
                                value={condition.operator}
                                onChange={(e) => {
                                  const newConditions = [...mappingForm.conditional_logic!.conditions];
                                  newConditions[idx] = {
                                    ...condition,
                                    operator: e.target.value as Condition["operator"],
                                  };
                                  setMappingForm({
                                    ...mappingForm,
                                    conditional_logic: {
                                      ...mappingForm.conditional_logic!,
                                      conditions: newConditions,
                                    },
                                  });
                                }}
                                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                              >
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                                <option value="contains">Contains</option>
                                <option value="not_contains">Not Contains</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700">
                                Expected Value
                              </label>
                              <input
                                type="text"
                                value={condition.answer_value}
                                onChange={(e) => {
                                  const newConditions = [...mappingForm.conditional_logic!.conditions];
                                  newConditions[idx] = { ...condition, answer_value: e.target.value };
                                  setMappingForm({
                                    ...mappingForm,
                                    conditional_logic: {
                                      ...mappingForm.conditional_logic!,
                                      conditions: newConditions,
                                    },
                                  });
                                }}
                                placeholder="e.g., Yes, No, Foreclosure"
                                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const newConditions = [
                              ...mappingForm.conditional_logic!.conditions,
                              { question_id: "", answer_value: "", operator: "equals" as const },
                            ];
                            setMappingForm({
                              ...mappingForm,
                              conditional_logic: {
                                ...mappingForm.conditional_logic!,
                                conditions: newConditions,
                              },
                            });
                          }}
                          className="w-full rounded border-2 border-dashed border-purple-300 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100"
                        >
                          + Add Another Condition
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {mappingForm.error && (
                  <p className="text-sm text-red-600">{mappingForm.error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={saveMapping}
                    disabled={mappingForm.isSaving || !mappingForm.from_question_id}
                    className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:opacity-50"
                  >
                    {mappingForm.isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={resetMappingForm}
                    className="rounded-lg border border-black/10 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {visibleMappings.map((mapping) => (
              <div
                key={mapping.id}
                className={`rounded-xl border border-black/8 bg-white p-4 ${
                  mapping.deleted_at ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">
                        Priority: {mapping.priority}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <p className="font-semibold text-[var(--color-navy)]">
                        From: {mapping.from_question?.question_text || "Unknown"}
                      </p>
                      {mapping.answer_value && (
                        <p className="mt-1 text-[var(--color-muted)]">
                          When answer = "{mapping.answer_value}"
                        </p>
                      )}
                      {!mapping.answer_value && (
                        <p className="mt-1 text-[var(--color-muted)]">
                          For any answer (default)
                        </p>
                      )}
                      {mapping.to_question_id && (
                        <p className="mt-1 font-semibold text-green-700">
                          → To: {mapping.to_question?.question_text || "Unknown"}
                        </p>
                      )}
                      {mapping.redirect_url && (
                        <p className="mt-1 font-semibold text-blue-700">
                          → Redirect: {mapping.redirect_url}
                        </p>
                      )}
                      {!mapping.to_question_id && !mapping.redirect_url && (
                        <p className="mt-1 font-semibold text-orange-700">
                          → End of flow (submit)
                        </p>
                      )}
                      {mapping.conditional_logic && mapping.conditional_logic.conditions.length > 0 && (
                        <div className="mt-2 rounded border border-purple-200 bg-purple-50 p-2">
                          <p className="text-xs font-bold text-purple-900">
                            ⚡ Conditional Logic ({mapping.conditional_logic.operator})
                          </p>
                          {mapping.conditional_logic.conditions.map((cond, idx) => {
                            const condQuestion = questions.find(q => q.id === cond.question_id);
                            return (
                              <p key={idx} className="mt-1 text-xs text-purple-700">
                                • {condQuestion?.question_text || "Unknown"} {cond.operator} "{cond.answer_value}"
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {!mapping.deleted_at && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditMapping(mapping)}
                        className="rounded bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMapping(mapping.id)}
                        className="rounded bg-red-50 px-3 py-1 text-xs font-bold text-red-700 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
