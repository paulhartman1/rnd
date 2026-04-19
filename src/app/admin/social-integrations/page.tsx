import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "../admin-nav";

export default async function SocialIntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        {/* Header */}
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Admin Tools
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Social Media Integration
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Configure and manage your social media integrations for automated posting and engagement.
          </p>
        </header>

        {/* Coming Soon Notice */}
        <div className="rounded-[1.4rem] border border-blue-200 bg-blue-50 px-6 py-8 text-center">
          <div className="mx-auto max-w-2xl">
            <div className="text-5xl mb-4">🚧</div>
            <h2 className="text-2xl font-bold text-blue-900 mb-3">
              Coming Soon
            </h2>
            <p className="text-blue-800 leading-relaxed">
              Social media integration features are currently under development. 
              This page will allow you to connect and manage your social media accounts, 
              schedule posts, and track engagement across multiple platforms.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-900">
              <span>📅</span>
              <span>Expected availability: Q2 2026</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
