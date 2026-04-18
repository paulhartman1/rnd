import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/feature-flags";
import AdminNav from "../admin-nav";
import FeatureFlagsClient from "./feature-flags-client";

export default async function FeatureFlagsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Only super admins can access this page
  if (!isSuperAdmin(user.email)) {
    redirect("/admin");
  }

  // Fetch feature flags
  const { data: flags } = await supabase
    .from("feature_flags")
    .select("*")
    .order("flag_name", { ascending: true });

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AdminNav />

        {/* Header */}
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Super Admin
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Feature Flags
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Control which features are enabled. Only you and Christie can access this page.
          </p>
        </header>

        {/* Feature Flags List */}
        <FeatureFlagsClient initialFlags={flags || []} />
      </div>
    </main>
  );
}
