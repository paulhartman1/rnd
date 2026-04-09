import Link from "next/link";
import { redirect } from "next/navigation";
import { type LeadRow } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import LeadsClient from "./leads-client";

export default async function AdminLeadsPage() {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Supabase is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to continue.
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

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, status, owner_notes, listed_with_agent, property_type, owns_land, repairs_needed, close_timeline, sell_reason, acceptable_offer, street_address, city, state, postal_code, full_name, email, phone, sms_consent, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as LeadRow[];

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Lead dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Manage seller leads
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Review intake responses, update lead status, and keep notes in one place.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-4"
            >
              Back to landing page
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load leads. Confirm the `leads` table and RLS policies are applied.
          </div>
        ) : (
          <LeadsClient initialLeads={leads} />
        )}
      </div>
    </main>
  );
}
