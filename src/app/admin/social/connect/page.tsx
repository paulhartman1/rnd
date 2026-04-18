"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";

function ConnectContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    // Redirect to OAuth initiation endpoint
    window.location.href = "/api/social/auth/meta";
  };

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)]">
      <div className="mx-auto max-w-2xl">
        {/* Back Button */}
        <Link
          href="/admin/social"
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-muted)] transition-all active:text-[var(--color-navy)] sm:hover:bg-black/5"
        >
          ← Back to Social Media
        </Link>

        {/* Header */}
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-4xl">
            🔗
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Connect Meta Account
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Link your Facebook pages and Instagram business accounts to start posting.
          </p>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-900">Connection Failed</p>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-bold text-green-900">✓ Success!</p>
            <p className="mt-2 text-sm text-green-700">{success}</p>
            <Link
              href="/admin/social"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-base font-bold text-white shadow-md transition-all active:scale-[0.98] sm:w-auto sm:hover:bg-green-700"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 space-y-4 rounded-xl border border-black/6 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--color-navy)]">What You'll Need</h2>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                1
              </div>
              <div>
                <p className="font-semibold text-[var(--color-navy)]">Facebook Page</p>
                <p className="text-sm text-[var(--color-muted)]">
                  You'll need admin access to at least one Facebook page.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-700">
                2
              </div>
              <div>
                <p className="font-semibold text-[var(--color-navy)]">Instagram Business Account (Optional)</p>
                <p className="text-sm text-[var(--color-muted)]">
                  To post to Instagram, link an Instagram business account to your Facebook page.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                3
              </div>
              <div>
                <p className="font-semibold text-[var(--color-navy)]">Grant Permissions</p>
                <p className="text-sm text-[var(--color-muted)]">
                  You'll be asked to grant permissions to manage posts on your behalf.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 sm:hover:bg-blue-700"
        >
          {isConnecting ? (
            <>
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Connecting...
            </>
          ) : (
            <>
              <span className="text-2xl">🔗</span>
              Connect with Meta
            </>
          )}
        </button>

        {/* What Happens Next */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">ℹ️ What Happens Next</p>
          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            <li>• You'll be redirected to Facebook to log in</li>
            <li>• Select which pages you want to connect</li>
            <li>• Grant posting permissions</li>
            <li>• You'll be brought back here automatically</li>
          </ul>
        </div>

        {/* Privacy Note */}
        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          We'll only post when you explicitly create a post. Your credentials are securely stored.
        </p>
      </div>
    </main>
  );
}

export default function ConnectMetaAccount() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-primary-gold)] border-t-transparent"></div>
          <p className="text-sm text-[var(--color-muted)]">Loading...</p>
        </div>
      </main>
    }>
      <ConnectContent />
    </Suspense>
  );
}
