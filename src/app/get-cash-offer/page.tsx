"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { type IntakeAnswers } from "@/lib/leads";
import { isValidEmail, isValidPhone } from "@/lib/validation";
import {
  type IntakeQuestion,
  type QuestionMapping,
  findNextStep,
  getFirstQuestion,
} from "@/lib/questions";


const initialAnswers: IntakeAnswers = {
  listedWithAgent: "",
  propertyType: "",
  ownsLand: "",
  repairsNeeded: "",
  closeTimeline: "",
  sellReason: "",
  acceptableOffer: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  fullName: "",
  email: "",
  phone: "",
  smsConsent: false,
};

export default function GetCashOfferPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<IntakeAnswers>(initialAnswers);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [mappings, setMappings] = useState<QuestionMapping[]>([]);
  const [questionPath, setQuestionPath] = useState<IntakeQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; phone?: string }>({});

  // Fetch questions and mappings on mount
  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch("/api/questions");
        if (!response.ok) throw new Error("Failed to load questions");
        const data = await response.json();
        console.log("API Response:", data);
        console.log("Questions:", data.questions);
        console.log("Mappings:", data.mappings);
        
        setQuestions(data.questions || []);
        setMappings(data.mappings || []);
        
        // Set first question
        const firstQuestion = getFirstQuestion(data.questions || []);
        console.log("First question:", firstQuestion);
        
        if (firstQuestion) {
          setCurrentQuestion(firstQuestion);
          setQuestionPath([firstQuestion]);
        } else {
          console.error("No first question found. Questions array:", data.questions);
        }
      } catch (error) {
        console.error("Error loading questions:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadQuestions();
  }, []);

  const progress = currentQuestion && questionPath.length > 0
    ? Math.round((questionPath.length / Math.max(questions.length, questionPath.length)) * 100)
    : 0;

  const updateAnswer = <K extends keyof IntakeAnswers>(
    field: K,
    value: IntakeAnswers[K],
  ) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  // Get current answer for validation
  const getCurrentAnswer = (): string => {
    if (!currentQuestion) return "";
    if (currentQuestion.field_name && currentQuestion.field_name in answers) {
      const value = answers[currentQuestion.field_name as keyof IntakeAnswers];
      return typeof value === "string" ? value : "";
    }
    return "";
  };

  const currentStepIsValid = useMemo(() => {
    if (!currentQuestion) return false;

    if (currentQuestion.question_type === "choice") {
      return getCurrentAnswer().trim().length > 0;
    }

    if (currentQuestion.question_type === "text") {
      return getCurrentAnswer().trim().length > 0;
    }

    if (currentQuestion.question_type === "address") {
      return (
        answers.streetAddress.trim().length > 0 &&
        answers.city.trim().length > 0 &&
        answers.state.trim().length > 0 &&
        answers.postalCode.trim().length > 0
      );
    }

    if (currentQuestion.question_type === "contact") {
      const emailValid = isValidEmail(answers.email);
      const phoneValid = isValidPhone(answers.phone);
      return (
        answers.fullName.trim().length > 0 &&
        emailValid &&
        phoneValid &&
        answers.smsConsent
      );
    }

    return false;
  }, [answers, currentQuestion]);

  const handleContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setValidationErrors({});

    if (!currentStepIsValid || !currentQuestion) {
      return;
    }

    // Get the answer for the current question
    const currentAnswer = getCurrentAnswer();

    // Find the next step based on the answer and mappings
    const { nextQuestionId, redirectUrl } = findNextStep(
      currentQuestion.id,
      currentAnswer,
      mappings,
    );

    // Handle redirect
    if (redirectUrl) {
      router.push(redirectUrl);
      return;
    }

    // Handle next question
    if (nextQuestionId) {
      const nextQuestion = questions.find((q) => q.id === nextQuestionId);
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        setQuestionPath((prev) => [...prev, nextQuestion]);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    // No next question - submit the form
    setIsSubmitting(true);
    try {
      // Filter out empty ownsLand field if not provided
      const submissionData = { ...answers };
      if (!submissionData.ownsLand || submissionData.ownsLand.trim() === "") {
        delete submissionData.ownsLand;
      }
      
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "We could not submit your request right now. Please try again.";
        setSubmitError(errorMessage);
        setIsSubmitting(false);
        return;
      }
      setSubmitted(true);
      setIsSubmitting(false);
    } catch (error) {
      setSubmitError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (questionPath.length <= 1) {
      return;
    }
    // Remove current question and go back to previous
    const newPath = questionPath.slice(0, -1);
    setQuestionPath(newPath);
    setCurrentQuestion(newPath[newPath.length - 1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
        <header className="border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Rush N Dush Logistics LLC logo"
                width={136}
                height={56}
                className="h-10 w-auto rounded-md object-contain sm:h-12"
              />
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5"
            >
              Back to Home
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Request received
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)] sm:text-4xl">
              Thanks, {answers.fullName.split(" ")[0] || "there"}! We've got your information.
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
              We're reviewing your property details right now. Expect to hear from us within 24 hours with your cash offer.
            </p>
            <div className="mt-8 rounded-2xl bg-[var(--color-surface-soft)] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                What happens next
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-navy)]">
                <li>• We'll review your property and prepare a fair cash offer</li>
                <li>• We'll call or email you within 24 hours with your offer</li>
                <li>• If you accept, we'll schedule a closing date that works for you</li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)]"
            >
              Return to Home
            </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-lg text-[var(--color-muted)]">Loading questions...</p>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-lg text-red-600">No questions available. Please contact support.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Rush N Dush Logistics LLC logo"
              width={136}
              height={56}
              className="h-10 w-auto rounded-md object-contain sm:h-12"
            />
            <div>
              <p className="text-sm font-extrabold tracking-tight text-[var(--color-navy)]">
                Rush N Dush Logistics
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Get Your Cash Offer
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5"
          >
            Back
          </Link>
        </div>
      </header>

      <section className="bg-[linear-gradient(135deg,var(--color-navy)_0%,#112547_60%,#0d1c35_100%)] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-primary-gold)]">
            Get your cash offer
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Tell us about your property
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/80">
            Answer a few quick questions so we can prepare your no-obligation cash offer. This takes about 3 minutes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <form
          onSubmit={handleContinue}
          className="rounded-[1.8rem] border border-black/6 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-8"
        >
          <div className="flex flex-col gap-4 border-b border-black/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Step {questionPath.length}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-navy)] sm:text-3xl">
                {currentQuestion.question_text}
              </h2>
              {currentQuestion.helper_text ? (
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{currentQuestion.helper_text}</p>
              ) : null}
            </div>
            <p className="text-sm font-semibold text-[var(--color-muted)]">{progress}% complete</p>
          </div>

          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary-gold)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {currentQuestion.question_type === "choice" && currentQuestion.options ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const fieldName = currentQuestion.field_name as keyof IntakeAnswers;
                const selected = fieldName && answers[fieldName] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => fieldName && updateAnswer(fieldName, option)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-[var(--color-primary-gold)] bg-[var(--color-brand-soft)] text-[var(--color-navy)]"
                        : "border-black/10 bg-white text-[var(--color-navy)] hover:border-[var(--color-primary-gold)]/60"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : null}

          {currentQuestion.question_type === "text" ? (
            <div className="mt-7">
              <input
                type="text"
                value={currentQuestion.field_name ? answers[currentQuestion.field_name as keyof IntakeAnswers] as string : ""}
                onChange={(event) => currentQuestion.field_name && updateAnswer(currentQuestion.field_name as keyof IntakeAnswers, event.target.value)}
                placeholder={currentQuestion.placeholder || ""}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
              />
            </div>
          ) : null}

          {currentQuestion.question_type === "address" ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">Street address</span>
                <input
                  type="text"
                  value={answers.streetAddress}
                  onChange={(event) => updateAnswer("streetAddress", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-muted)]">City</span>
                <input
                  type="text"
                  value={answers.city}
                  onChange={(event) => updateAnswer("city", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-muted)]">State</span>
                <input
                  type="text"
                  value={answers.state}
                  onChange={(event) => updateAnswer("state", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">Postal code</span>
                <input
                  type="text"
                  value={answers.postalCode}
                  onChange={(event) => updateAnswer("postalCode", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
            </div>
          ) : null}

          {currentQuestion.question_type === "contact" ? (
            <div className="mt-7 grid gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-muted)]">Full name</span>
                <input
                  type="text"
                  value={answers.fullName}
                  onChange={(event) => updateAnswer("fullName", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-muted)]">Email</span>
                <input
                  type="email"
                  value={answers.email}
                  onChange={(event) => {
                    updateAnswer("email", event.target.value);
                    if (validationErrors.email) {
                      setValidationErrors({ ...validationErrors, email: undefined });
                    }
                  }}
                  onBlur={() => {
                    if (answers.email && !isValidEmail(answers.email)) {
                      setValidationErrors({ ...validationErrors, email: "Please enter a valid email address" });
                    }
                  }}
                  className={`mt-2 w-full rounded-xl border px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)] ${
                    validationErrors.email ? "border-red-400" : "border-black/10"
                  }`}
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={validationErrors.email ? "email-error" : undefined}
                />
                {validationErrors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">
                    {validationErrors.email}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-muted)]">Phone</span>
                <input
                  type="tel"
                  value={answers.phone}
                  onChange={(event) => {
                    updateAnswer("phone", event.target.value);
                    if (validationErrors.phone) {
                      setValidationErrors({ ...validationErrors, phone: undefined });
                    }
                  }}
                  onBlur={() => {
                    if (answers.phone && !isValidPhone(answers.phone)) {
                      setValidationErrors({ ...validationErrors, phone: "Please enter a valid 10-digit phone number" });
                    }
                  }}
                  placeholder="(123) 456-7890"
                  className={`mt-2 w-full rounded-xl border px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)] ${
                    validationErrors.phone ? "border-red-400" : "border-black/10"
                  }`}
                  aria-invalid={!!validationErrors.phone}
                  aria-describedby={validationErrors.phone ? "phone-error" : undefined}
                />
                {validationErrors.phone && (
                  <p id="phone-error" className="mt-1 text-sm text-red-600">
                    {validationErrors.phone}
                  </p>
                )}
              </label>
              <label className="mt-1 flex items-start gap-3 rounded-xl border border-black/8 bg-[var(--color-surface-soft)] px-4 py-3">
                <input
                  type="checkbox"
                  checked={answers.smsConsent}
                  onChange={(event) => updateAnswer("smsConsent", event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--color-primary-gold)]"
                />
                <span className="text-sm leading-6 text-[var(--color-muted)]">
                  I agree to receive text messages and calls from Rush N Dush Logistics about my cash offer. Message and data rates may apply. I can opt out anytime.
                </span>
              </label>
            </div>
          ) : null}

          <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={questionPath.length <= 1}
              className="inline-flex items-center justify-center rounded-lg border border-black/12 px-5 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!currentStepIsValid || isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSubmitting ? "Submitting..." : "Continue"}
            </button>
          </div>
          {submitError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
