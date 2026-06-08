import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../admin-nav";
import FormsClient from "./forms-client";
import type { FormRow } from "@/lib/forms";
import type { LeadRow } from "@/lib/leads";

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const params = await searchParams;
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

  // Check feature flag
  const formsEnabled = await isFeatureEnabled("forms", user.email || undefined);
  if (!formsEnabled) {
    redirect("/admin");
  }

  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  // Fetch forms and leads for the dropdown
  const [formsResult, leadsResult] = await Promise.all([
    queryClient
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false }),
    queryClient
      .from("leads")
      .select("id, full_name, email")
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
  ]);

  const forms = (formsResult.data as FormRow[]) || [];
  const leads = (leadsResult.data as LeadRow[]) || [];

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Forms & Documents
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Manage Forms
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Create and manage purchase agreements and other legal documents
          </p>
        </header>

        <FormsClient initialForms={forms} leads={leads} initialLeadId={params.leadId} />
      </div>
    </main>
  );
}
