import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "../../../../admin-nav";
import ApiKeysClient from "./api-keys-client";

export default async function SourceApiKeysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Fetch the source
  const sourceResult = await queryClient
    .from("sources")
    .select("*")
    .eq("id", id)
    .single();

  if (sourceResult.error || !sourceResult.data) {
    redirect("/admin/settings/sources");
  }

  // Fetch existing API keys for this source
  const keysResult = await queryClient
    .from("source_api_keys")
    .select("id, name, created_at, last_used_at, active")
    .eq("source_id", id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <Link
            href="/admin/settings/sources"
            className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] transition hover:text-[var(--color-navy)]"
          >
            ← Back to Lead Sources
          </Link>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Admin Settings
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            API Keys: {sourceResult.data.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Generate and manage API keys for this lead source
          </p>
        </header>

        <ApiKeysClient
          sourceId={id}
          sourceName={sourceResult.data.name}
          initialKeys={keysResult.data || []}
        />
      </div>
    </main>
  );
}
