import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../../admin-nav";
import FormDetailClient from "./form-detail-client";
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
        <FormDetailClient
          form={form}
          lead={lead || null}
          property={property || null}
          allLeads={leads}
          allProperties={properties}
        />
      </div>
    </main>
  );
}
