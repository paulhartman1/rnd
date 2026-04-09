"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { type IntakeAnswers } from "@/lib/leads";

type ChoiceStep = {
  type: "choice";
  field:
    | "listedWithAgent"
    | "propertyType"
    | "ownsLand"
    | "repairsNeeded"
    | "closeTimeline"
    | "sellReason";
  question: string;
  helper?: string;
  options: string[];
};

type TextStep = {
  type: "text";
  field: "acceptableOffer";
  question: string;
  helper?: string;
  placeholder: string;
};

type AddressStep = {
  type: "address";
  question: string;
  helper?: string;
};

type ContactStep = {
  type: "contact";
  question: string;
  helper?: string;
};

type IntakeStep = ChoiceStep | TextStep | AddressStep | ContactStep;

const intakeSteps: IntakeStep[] = [
  {
    type: "choice",
    field: "listedWithAgent",
    question: "Is your property listed with an agent?",
    options: ["Yes", "No"],
  },
  {
    type: "choice",
    field: "propertyType",
    question: "What type of property is it?",
    options: [
      "Single Family",
      "Multi Family",
      "Townhouse / Row House",
      "Vacant Land",
      "Mobile / Manufactured Home",
      "Apartment / Condo",
    ],
  },
  {
    type: "choice",
    field: "ownsLand",
    question: "Do you also own the land?",
    options: ["Yes", "No"],
  },
  {
    type: "choice",
    field: "repairsNeeded",
    question: "How would you describe the repairs needed?",
    helper: "Pick the option that best applies.",
    options: [
      "Major Renovations $$$ - Full Gut Job",
      "Minor Renovations $$ - Kitchen, Bathroom, Roof",
      "Cosmetic Work $ - Flooring, Paint",
      "Excellent - Fully renovated and updated in past 2 years",
    ],
  },
  {
    type: "choice",
    field: "closeTimeline",
    question: "How soon are you looking to finalize the sale?",
    options: ["ASAP", "0-14 Days", "14-30 Days", "30-60 Days", "60-90 Days", "6 Months +"],
  },
  {
    type: "choice",
    field: "sellReason",
    question: "Reason for wanting to sell?",
    options: [
      "Inherited",
      "Divorce",
      "Too Many Repairs",
      "Tired Landlord",
      "Pre-foreclosure / Foreclosure",
      "Emergency Reasons",
      "Just Curious",
    ],
  },
  {
    type: "text",
    field: "acceptableOffer",
    question:
      "If we offered you cash, paid all closing costs, and closed on your timeline, what is the lowest acceptable offer you would take?",
    placeholder: "$250,000",
  },
  {
    type: "address",
    question: "What is the address of the property?",
  },
  {
    type: "contact",
    question: "Finally, who should we send the offer to?",
    helper: "We will follow up with your no-obligation cash offer details.",
  },
];

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = intakeSteps[currentStepIndex];
  const progress = Math.round(((currentStepIndex + 1) / intakeSteps.length) * 100);

  const updateAnswer = <K extends keyof IntakeAnswers>(
    field: K,
    value: IntakeAnswers[K],
  ) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const currentStepIsValid = useMemo(() => {
    if (currentStep.type === "choice" || currentStep.type === "text") {
      return answers[currentStep.field].trim().length > 0;
    }

    if (currentStep.type === "address") {
      return (
        answers.streetAddress.trim().length > 0 &&
        answers.city.trim().length > 0 &&
        answers.state.trim().length > 0 &&
        answers.postalCode.trim().length > 0
      );
    }

    return (
      answers.fullName.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(answers.email) &&
      answers.phone.trim().length > 0 &&
      answers.smsConsent
    );
  }, [answers, currentStep]);

  const handleContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!currentStepIsValid) {
      return;
    }

    if (currentStepIndex === intakeSteps.length - 1) {
      setIsSubmitting(true);
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        setSubmitError("We could not submit your request right now. Please try again.");
        setIsSubmitting(false);
        return;
      }
      setSubmitted(true);
      setIsSubmitting(false);
      return;
    }
    if (currentStepIndex === 0 && answers.listedWithAgent === "Yes") {
      router.push("/get-cash-offer/bye-felicia");
      return;
    }

    setCurrentStepIndex((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (currentStepIndex === 0) {
      return;
    }
    setCurrentStepIndex((prev) => prev - 1);
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
              Intake received
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)] sm:text-4xl">
              Thanks, {answers.fullName.split(" ")[0] || "there"} — your request is in.
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
              We’ll review the property details and reach out using the contact info you provided.
              You can expect the next update from our team shortly.
            </p>
            <div className="mt-8 rounded-2xl bg-[var(--color-surface-soft)] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Next
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-navy)]">
                <li>• Property details are reviewed against your timeline and condition notes.</li>
                <li>• Our team follows up by phone/email to confirm any missing info.</li>
                <li>• You receive your no-obligation cash offer details.</li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)]"
              >
                Return to Landing Page
              </Link>
            </div>
          </div>
        </section>
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
                Cash Offer Intake
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
            New part of the process
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Let’s build your cash-offer request
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/80">
            This short intake mirrors the key qualification questions and helps us return a
            no-obligation offer quickly.
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
                Step {currentStepIndex + 1} of {intakeSteps.length}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-navy)] sm:text-3xl">
                {currentStep.question}
              </h2>
              {currentStep.helper ? (
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{currentStep.helper}</p>
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

          {currentStep.type === "choice" ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {currentStep.options.map((option) => {
                const selected = answers[currentStep.field] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateAnswer(currentStep.field, option)}
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

          {currentStep.type === "text" ? (
            <div className="mt-7">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  Lowest acceptable offer
                </span>
                <input
                  type="text"
                  value={answers.acceptableOffer}
                  onChange={(event) => updateAnswer("acceptableOffer", event.target.value)}
                  placeholder={currentStep.placeholder}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
            </div>
          ) : null}

          {currentStep.type === "address" ? (
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

          {currentStep.type === "contact" ? (
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
                  onChange={(event) => updateAnswer("email", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-muted)]">Phone</span>
                <input
                  type="tel"
                  value={answers.phone}
                  onChange={(event) => updateAnswer("phone", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
                />
              </label>
              <label className="mt-1 flex items-start gap-3 rounded-xl border border-black/8 bg-[var(--color-surface-soft)] px-4 py-3">
                <input
                  type="checkbox"
                  checked={answers.smsConsent}
                  onChange={(event) => updateAnswer("smsConsent", event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--color-primary-gold)]"
                />
                <span className="text-sm leading-6 text-[var(--color-muted)]">
                  I consent to receive SMS notifications, alerts, and occasional marketing
                  communication from Rush N Dush Logistics LLC. Message/data rates may apply.
                </span>
              </label>
            </div>
          ) : null}

          <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="inline-flex items-center justify-center rounded-lg border border-black/12 px-5 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!currentStepIsValid || isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {currentStepIndex === intakeSteps.length - 1
                ? isSubmitting
                  ? "Submitting..."
                  : "Submit Offer Request"
                : "Continue"}
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
