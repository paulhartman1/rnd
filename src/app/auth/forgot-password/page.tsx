"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to send reset email. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Password reset link sent! Check your email.");
      setIsSubmitting(false);
    } catch {
      setErrorMessage(
        "An unexpected error occurred. Please try again or contact support.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Reset Password
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)]">
          Forgot your password?
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-muted)]">
              Email Address
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
              placeholder="you@example.com"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !!successMessage}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] transition"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
