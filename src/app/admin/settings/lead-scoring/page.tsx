import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "../../admin-nav";
import ScoringConfigClient from "./scoring-config-client";

export default async function LeadScoringSettingsPage() {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Supabase is not configured yet.
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  // Fetch all scoring configurations
  const { data: configs } = await queryClient
    .from("lead_scoring_config")
    .select("*")
    .order("created_at", { ascending: false });

  const activeConfig = configs?.find((c) => c.is_active);
  const inactiveConfigs = configs?.filter((c) => !c.is_active) || [];

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Lead Scoring
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Scoring Configuration
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Configure criteria and weights for prioritizing property leads
          </p>
        </header>

        <ScoringConfigClient 
          activeConfig={activeConfig || null} 
          inactiveConfigs={inactiveConfigs}
        />
      </div>
    </main>
  );
}
