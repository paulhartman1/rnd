import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../admin-nav";
import DialerClient from "./dialer-client";

export default async function DialerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const hasAccess = await isFeatureEnabled("autodialer", user.email);
  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Autodialer feature is not enabled for your account.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Autodialer
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Multi-Agent Dialing System
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage campaigns, agents, and automated outbound calling.
          </p>
        </header>

        <DialerClient />
      </div>
    </main>
  );
}
