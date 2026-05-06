import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../../admin-nav";
import type { FormRow } from "@/lib/forms";
import type { PropertyRow } from "@/lib/properties";
import type { LeadRow } from "@/lib/leads";

export default async function FormDetailsPage({ params }: { params: Promise<{ formId: string }> }) {
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

  const { formId } = await params;
  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  // Fetch form, lead, and property data
  const [formResult, leadsResult, propertiesResult] = await Promise.all([
    queryClient.from("forms").select("*").eq("id", formId).single(),
    queryClient.from("leads").select("id, full_name, email, phone").is("deleted_at", null),
    queryClient.from("properties").select("*"),
  ]);

  if (formResult.error || !formResult.data) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AdminNav />
          <div className="rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
            Form not found
          </div>
        </div>
      </main>
    );
  }

  const form = formResult.data as FormRow;
  const leads = (leadsResult.data as LeadRow[]) || [];
  const properties = (propertiesResult.data as PropertyRow[]) || [];

  const lead = leads.find((l) => l.id === form.lead_id);
  const property = properties.find((p) => p.id === form.property_id);

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Purchase Agreement
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Form Details
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Created {new Date(form.created_at).toLocaleDateString()} •  Status: {form.status}
          </p>
        </header>

        <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-navy)]">Lead Information</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Name:</span> {lead?.full_name || "Unknown"}</p>
            <p><span className="font-semibold">Email:</span> {lead?.email || "N/A"}</p>
            <p><span className="font-semibold">Phone:</span> {lead?.phone || "N/A"}</p>
          </div>

          {property && (
            <>
              <h2 className="mb-4 mt-6 text-lg font-bold text-[var(--color-navy)]">Property Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-semibold">Address:</span> {property.street_address}</p>
                <p><span className="font-semibold">City, State ZIP:</span> {property.city}, {property.state} {property.postal_code}</p>
                {property.apn && <p><span className="font-semibold">APN:</span> {property.apn}</p>}
                {property.property_type && <p><span className="font-semibold">Type:</span> {property.property_type}</p>}
              </div>
            </>
          )}

          <h2 className="mb-4 mt-6 text-lg font-bold text-[var(--color-navy)]">Form Data</h2>
          <pre className="rounded bg-gray-100 p-4 text-xs overflow-x-auto">
            {JSON.stringify(form.form_data, null, 2)}
          </pre>

          <div className="mt-6 text-center text-sm text-[var(--color-muted)]">
            <p>Purchase agreement form editing interface coming soon.</p>
            <p className="mt-2">This form can be edited and sent via DocuSign when that feature is enabled.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
