"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
  account_username: string | null;
  profile_picture_url: string | null;
}

export default function CreatePost() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch connected accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch("/api/social/accounts");
        if (response.ok) {
        const data = await response.json();
          setAccounts(data.accounts || []);
          // Auto-select all accounts by default
          const allIds = new Set<string>(data.accounts.map((a: SocialAccount) => a.id));
          setSelectedAccounts(allIds);
        } else {
          setError("Failed to load accounts");
        }
      } catch (err) {
        setError("Failed to connect to server");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  const toggleAccount = (accountId: string) => {
    const newSelection = new Set(selectedAccounts);
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
    } else {
      newSelection.add(accountId);
    }
    setSelectedAccounts(newSelection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedAccounts.size === 0) {
      setError("Please select at least one account");
      return;
    }

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    // Check if Instagram is selected and no image provided
    const hasInstagram = Array.from(selectedAccounts).some((id) => {
      const account = accounts.find((a) => a.id === id);
      return account?.platform === "instagram";
    });

    if (hasInstagram && !imageUrl.trim()) {
      setError("Instagram requires an image. Please add an image URL or deselect Instagram.");
      return;
    }

    setIsPosting(true);

    try {
      const response = await fetch("/api/social/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountIds: Array.from(selectedAccounts),
          message: message.trim(),
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/admin/social");
        }, 2000);
      } else {
        setError(data.error || "Failed to create post");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-primary-gold)] border-t-transparent"></div>
          <p className="text-sm text-[var(--color-muted)]">Loading...</p>
        </div>
      </main>
    );
  }

  if (accounts.length === 0) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="mb-4 text-sm font-bold text-red-900">
              No connected accounts found
            </p>
            <Link
              href="/admin/social/connect"
              className="inline-flex rounded-xl bg-red-600 px-6 py-3 text-base font-bold text-white shadow-md transition-all active:scale-[0.98]"
            >
              Connect Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
        <div className="w-full max-w-md rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mb-4 text-6xl">✓</div>
          <p className="text-xl font-black text-green-900">Post Published!</p>
          <p className="mt-2 text-sm text-green-700">
            Redirecting to dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-6 text-[var(--color-ink)] sm:py-10">
      <div className="mx-auto max-w-2xl">
        {/* Back Button */}
        <Link
          href="/admin/social"
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-muted)] transition-all active:text-[var(--color-navy)] sm:hover:bg-black/5"
        >
          ← Back
        </Link>

        {/* Header */}
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:px-6">
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-navy)] sm:text-3xl">
            Create Post
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Compose your message and select where to share it.
          </p>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-900">⚠️ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message Input */}
          <div className="rounded-xl border border-black/6 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-bold text-[var(--color-navy)]">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to share?"
              rows={6}
              className="w-full rounded-lg border border-black/10 p-4 text-base text-[var(--color-ink)] placeholder-[var(--color-muted)]/50 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              required
            />
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {message.length} characters
            </p>
          </div>

          {/* Image URL Input */}
          <div className="rounded-xl border border-black/6 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-bold text-[var(--color-navy)]">
              Image URL {Array.from(selectedAccounts).some(id => accounts.find(a => a.id === id)?.platform === "instagram") && "(Required for Instagram)"}
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-lg border border-black/10 p-4 text-base text-[var(--color-ink)] placeholder-[var(--color-muted)]/50 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Optional for Facebook, required for Instagram
            </p>
          </div>

          {/* Account Selection */}
          <div className="rounded-xl border border-black/6 bg-white p-5 shadow-sm">
            <label className="mb-3 block text-sm font-bold text-[var(--color-navy)]">
              Post To *
            </label>
            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => toggleAccount(account.id)}
                  className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 transition-all active:scale-[0.98] ${
                    selectedAccounts.has(account.id)
                      ? "border-[var(--color-accent)] bg-amber-50"
                      : "border-black/10 bg-white"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 ${
                      selectedAccounts.has(account.id)
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                        : "border-black/20 bg-white"
                    }`}
                  >
                    {selectedAccounts.has(account.id) && (
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Account Info */}
                  {account.profile_picture_url && (
                    <img
                      src={account.profile_picture_url}
                      alt={account.account_name}
                      className="h-10 w-10 rounded-full border"
                    />
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-bold text-[var(--color-navy)]">
                      {account.account_name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {account.platform === "facebook" ? "📘 Facebook" : "📷 Instagram"}
                      {account.account_username && ` • @${account.account_username}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Selected: {selectedAccounts.size} of {accounts.length}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPosting || selectedAccounts.size === 0 || !message.trim()}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[var(--color-primary-gold)] to-amber-400 px-6 py-4 text-lg font-bold text-[var(--color-navy)] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 sm:hover:shadow-xl"
          >
            {isPosting ? (
              <>
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-navy)] border-t-transparent"></span>
                Publishing...
              </>
            ) : (
              <>
                <span className="text-2xl">🚀</span>
                Publish Post
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
