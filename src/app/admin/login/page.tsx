"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("Sign-in failed. Check your credentials and try again.");
        setIsSubmitting(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setErrorMessage(
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      setIsSubmitting(false);
      return;
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Owner access
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)]">
          Admin login
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Sign in to review and manage incoming seller leads.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-muted)]">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-muted)]">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-6 py-3 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-4"
          >
            Back to landing page
          </Link>
        </div>
      </div>
    </main>
  );
}
