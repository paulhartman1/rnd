import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "../../admin-nav";
import SourcesClient from "./sources-client";

export default async function AdminLeadSourcesPage() {
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

  const sourcesResult = await queryClient
    .from("sources")
    .select("*")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <Link
            href="/admin/settings"
            className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] transition hover:text-[var(--color-navy)]"
          >
            ← Back to Settings
          </Link>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Admin Settings
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Lead Sources
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage where your leads come from
          </p>
        </header>

        <SourcesClient initialSources={sourcesResult.data || []} />
      </div>
    </main>
  );
}
