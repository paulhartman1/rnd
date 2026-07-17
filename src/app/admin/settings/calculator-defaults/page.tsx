import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "../../admin-nav";
import CalculatorDefaultsClient from "./calculator-defaults-client";
import type { NovationFormData } from "@/components/admin/NovationCalculator";

export default async function CalculatorDefaultsPage() {
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

  // Fetch calculator defaults
  const { data: defaults, error } = await queryClient
    .from("calculator_defaults")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching calculator defaults:", error);
  }

  // Convert database row to NovationFormData format
  const defaultValues: Partial<NovationFormData> | undefined = defaults
    ? {
        as_is_market_value: Number(defaults.as_is_market_value),
        percent_of_market_value: Number(defaults.percent_of_market_value),
        realtor_fee_percent: Number(defaults.realtor_fee_percent),
        double_close_fee_percent: Number(defaults.double_close_fee_percent),
        closing_attorney_fee: Number(defaults.closing_attorney_fee),
        title_insurance: Number(defaults.title_insurance),
        efile_fee: Number(defaults.efile_fee),
        recording_fee: Number(defaults.recording_fee),
        transfer_tax: Number(defaults.transfer_tax),
        flat_fee_listing: Number(defaults.flat_fee_listing),
        photographer_fee: Number(defaults.photographer_fee),
        other_expenses: Number(defaults.other_expenses),
        repair_costs: Number(defaults.repair_costs),
        interest_costs: Number(defaults.interest_costs),
        months_held: Number(defaults.months_held),
        desired_profit_access: Number(defaults.desired_profit_access),
        desired_profit_no_access: Number(defaults.desired_profit_no_access),
      }
    : undefined;

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Calculator Defaults
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Configure default values for the property analysis calculator. These values will be used
            as starting points when analyzing new properties.
          </p>
        </header>

        <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <CalculatorDefaultsClient initialValues={defaultValues} />
        </div>
      </div>
    </main>
  );
}
