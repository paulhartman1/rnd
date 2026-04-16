"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type FormEvent, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function CreatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      
      // Get hash params from URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get("type");
      
      console.log("Hash Params:", {
        type,
        allParams: Object.fromEntries(hashParams.entries()),
        fullHash: window.location.hash
      });
      
      // Check if this is an invite link
      if (type === "invite") {
        // Wait for Supabase to exchange the token for a session
        // This happens automatically via the hash fragment
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log("Session check:", {
          hasSession: !!session,
          error: error?.message
        });
        
        if (session) {
          setIsValidToken(true);
        } else {
          setErrorMessage("Failed to establish session. The invite link may have expired.");
        }
      } else {
        setErrorMessage("Invalid or missing invite link. Please check your email and try again.");
      }
      
      setIsLoading(false);
    }
    
    checkSession();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to set password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Password created successfully! Redirecting to login...");
      
      // Sign out the user so they can sign in with their new password
      await supabase.auth.signOut();
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/admin/login");
      }, 2000);
    } catch {
      setErrorMessage(
        "An unexpected error occurred. Please try again or contact support.",
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
          <p className="text-center text-[var(--color-muted)]">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isValidToken) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Invalid Invite Link
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            The invite link is invalid or has expired. Please contact your administrator for a new invitation.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/login"
              className="text-sm font-semibold text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-4"
            >
              Go to login page
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Welcome
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)]">
          Create your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Set a secure password for your account to complete the setup.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-muted)]">
              New Password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
              placeholder="At least 8 characters"
            />
          </label>
          
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-muted)]">
              Confirm Password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-base text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)]"
              placeholder="Re-enter your password"
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
            {isSubmitting ? "Creating password..." : "Create password"}
          </button>
        </form>

        <div className="mt-6 space-y-2">
          <p className="text-xs text-[var(--color-muted)]">
            Password requirements:
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs text-[var(--color-muted)]">
            <li>At least 8 characters long</li>
            <li>Should include a mix of letters, numbers, and symbols</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
          <p className="text-center text-[var(--color-muted)]">Loading...</p>
        </div>
      </main>
    }>
      <CreatePasswordForm />
    </Suspense>
  );
}
