import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../admin-nav";

export default async function SocialMediaDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Check if Facebook feature is enabled
  const isFacebookEnabled = await isFeatureEnabled("facebook_integration", user.email ?? undefined);

  // Fetch connected accounts
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Fetch recent posts
  const { data: recentPosts } = await supabase
    .from("social_posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const hasConnectedAccounts = accounts && accounts.length > 0;

  // Group accounts by platform
  const facebookAccounts = isFacebookEnabled 
    ? accounts?.filter((a) => a.platform === "facebook") || []
    : [];
  const instagramAccounts = accounts?.filter((a) => a.platform === "instagram") || [];

  // Post stats
  const publishedPosts = recentPosts?.filter((p) => p.status === "published").length || 0;
  const failedPosts = recentPosts?.filter((p) => p.status === "failed").length || 0;

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AdminNav />

        {/* Header */}
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Social Media
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Post to {isFacebookEnabled ? "Facebook & " : ""}Instagram
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage your connected accounts and create social media posts.
          </p>
        </header>

        {/* Main Action - Create Post (only show if connected) */}
        {hasConnectedAccounts && (
          <Link
            href="/admin/social/post"
            className="mb-6 flex items-center justify-between rounded-[1.4rem] border-2 border-[var(--color-primary-gold)] bg-gradient-to-br from-[var(--color-primary-gold)] to-amber-400 px-6 py-5 shadow-lg transition-all active:scale-[0.98] sm:hover:scale-[1.02]"
          >
            <div>
              <p className="text-xl font-black text-[var(--color-navy)]">Create New Post</p>
              <p className="mt-1 text-sm text-[var(--color-navy)]/70">
                Share to {accounts.length} connected account{accounts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl shadow-md">
              ✍️
            </div>
          </Link>
        )}

        {/* Connection Status */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-[var(--color-navy)]">Connected Accounts</h2>

          {!hasConnectedAccounts ? (
            <div className="rounded-[1.4rem] border border-blue-200 bg-blue-50 p-6">
              <p className="mb-4 text-sm font-semibold text-blue-900">
                No accounts connected yet. Connect your Meta Business account to start posting.
              </p>
              <Link
                href="/admin/social/connect"
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-md transition-all active:scale-[0.98] sm:w-auto sm:hover:bg-blue-700"
              >
                Connect Meta Account
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Facebook Accounts */}
              {facebookAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-4 rounded-xl border border-black/6 bg-white p-4 shadow-sm"
                >
                  {account.profile_picture_url && (
                    <img
                      src={account.profile_picture_url}
                      alt={account.account_name}
                      className="h-12 w-12 rounded-full border-2 border-blue-100"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-[var(--color-navy)]">{account.account_name}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Facebook Page • Connected {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
                    📘
                  </div>
                </div>
              ))}

              {/* Instagram Accounts */}
              {instagramAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-4 rounded-xl border border-black/6 bg-white p-4 shadow-sm"
                >
                  {account.profile_picture_url && (
                    <img
                      src={account.profile_picture_url}
                      alt={account.account_name}
                      className="h-12 w-12 rounded-full border-2 border-pink-100"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-[var(--color-navy)]">{account.account_name}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      @{account.account_username} • Connected {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xl">
                    📷
                  </div>
                </div>
              ))}

              {/* Add More Accounts Button */}
              <Link
                href="/admin/social/connect"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-muted)]/30 bg-white px-4 py-4 text-sm font-semibold text-[var(--color-muted)] transition-all active:scale-[0.98] sm:hover:border-[var(--color-accent)] sm:hover:text-[var(--color-accent)]"
              >
                <span className="text-2xl">+</span>
                Add More Accounts
              </Link>
            </div>
          )}
        </div>

        {/* Recent Posts */}
        {recentPosts && recentPosts.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-bold text-[var(--color-navy)]">Recent Posts</h2>

            {/* Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-black/6 bg-white p-4">
                <p className="text-2xl font-black text-green-600">{publishedPosts}</p>
                <p className="text-xs text-[var(--color-muted)]">Published</p>
              </div>
              <div className="rounded-xl border border-black/6 bg-white p-4">
                <p className="text-2xl font-black text-red-600">{failedPosts}</p>
                <p className="text-xs text-[var(--color-muted)]">Failed</p>
              </div>
            </div>

            {/* Post List */}
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-black/6 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {post.platform === "facebook" ? "📘" : "📷"}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        {post.platform}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        post.status === "published"
                          ? "bg-green-100 text-green-700"
                          : post.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>

                  <p className="mb-2 text-sm text-[var(--color-ink)]">
                    {post.message?.substring(0, 120)}
                    {post.message && post.message.length > 120 ? "..." : ""}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                    <span>{new Date(post.created_at).toLocaleString()}</span>
                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-600 active:text-blue-800"
                      >
                        View Post →
                      </a>
                    )}
                  </div>

                  {post.error_message && (
                    <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                      Error: {post.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
