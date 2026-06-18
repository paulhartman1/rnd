"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type FormEvent, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let timeoutId: NodeJS.Timeout;
    let isProcessing = false;
    
    async function handlePasswordReset() {
      // Check for hash fragment (implicit flow: #access_token=...&type=recovery)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (accessToken && type === 'recovery' && !isProcessing) {
          isProcessing = true;
          console.log('[Reset Password] Processing implicit flow recovery token');
          
          try {
            // Set the session using the tokens from the hash
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error('[Reset Password] Session setup error:', error);
              setErrorMessage(`Failed to establish session: ${error.message}`);
              setIsLoading(false);
              return;
            }
            
            if (data.session) {
              console.log('[Reset Password] Session established from implicit flow');
              setHasSession(true);
              setIsLoading(false);
              if (timeoutId) clearTimeout(timeoutId);
              
              // Clean up the hash from the URL
              window.history.replaceState(null, '', window.location.pathname);
            }
          } catch (err) {
            console.error('[Reset Password] Unexpected error:', err);
            setErrorMessage('An unexpected error occurred. Please try again.');
            setIsLoading(false);
          }
          return;
        }
      }
      
      // Check for token_hash and type in query params (PKCE flow)
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      if (tokenHash && type === 'recovery' && !isProcessing) {
        isProcessing = true;
        console.log('[Reset Password] Processing PKCE recovery token');
        
        try {
          // Verify the OTP token
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          
          if (error) {
            console.error('[Reset Password] Token verification error:', error);
            setErrorMessage(`Failed to verify reset link: ${error.message}`);
            setIsLoading(false);
            return;
          }
          
          if (data.session) {
            console.log('[Reset Password] Session established from PKCE token');
            setHasSession(true);
            setIsLoading(false);
            if (timeoutId) clearTimeout(timeoutId);
          }
        } catch (err) {
          console.error('[Reset Password] Unexpected error:', err);
          setErrorMessage('An unexpected error occurred. Please try again.');
          setIsLoading(false);
        }
      }
    }
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Reset Password] Auth state change:', event, !!session);
      
      if (session) {
        setHasSession(true);
        setIsLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
      // Don't show error on SIGNED_OUT - it happens intentionally after password reset
    });
    
    // Check for existing session or handle reset token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[Reset Password] Existing session found');
        setHasSession(true);
        setIsLoading(false);
      } else {
        // Try to handle implicit flow or PKCE flow
        handlePasswordReset().then(() => {
          // If still no session after handling tokens, set timeout
          supabase.auth.getSession().then(({ data: { session: newSession } }) => {
            if (!newSession) {
              timeoutId = setTimeout(() => {
                setErrorMessage("Unable to establish session. The reset link may have expired.");
                setIsLoading(false);
              }, 5000);
            }
          });
        });
      }
    });
    
    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchParams]);

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
        setErrorMessage(error.message || "Failed to reset password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Password reset successfully! Redirecting to login...");
      
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

  if (isLoading || !hasSession) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
          <p className="text-center text-[var(--color-muted)]">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Reset Password
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)]">
          Choose a new password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Enter your new password below.
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
            {isSubmitting ? "Resetting password..." : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-14 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-[1.8rem] border border-black/6 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.08)] sm:p-9">
          <p className="text-center text-[var(--color-muted)]">Loading...</p>
        </div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
