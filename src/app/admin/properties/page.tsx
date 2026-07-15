import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../admin-nav";
import PropertiesClient from "./properties-client";

export default async function PropertiesPage() {
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

  const propertiesEnabled = await isFeatureEnabled("properties", user.email || undefined);

  if (!propertiesEnabled) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-yellow-200 bg-yellow-50 px-6 py-5 text-sm text-yellow-700">
          Properties feature is not enabled.
        </div>
      </main>
    );
  }


  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  // Fetch all properties with geocoding and associated lead info
  const { data: properties, error } = await queryClient
    .from("properties")
    .select(`
      id,
      latitude,
      longitude,
      street_address,
      city,
      state,
      postal_code,
      county,
      apn,
      property_type_detail,
      bedroom_count,
      bathroom_count,
      total_building_area_sqft,
      lot_size_sqft,
      year_built,
      total_assessed_value,
      estimated_value,
      as_is_market_value,
      percent_of_market_value,
      realtor_fee_percent,
      double_close_fee_percent,
      closing_attorney_fee,
      title_insurance,
      efile_fee,
      recording_fee,
      transfer_tax,
      flat_fee_listing,
      photographer_fee,
      other_expenses,
      repair_costs,
      interest_costs,
      months_held,
      desired_profit_access,
      desired_profit_no_access,
      last_sale_date,
      last_sale_price,
      lead_id,
      leads!inner(
        id,
        full_name,
        email,
        phone,
        status,
        deleted_at
      )
    `)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .is("leads.deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching properties:", error);
  }

  const propertiesWithLeads = (properties || []).map((property) => {
    // Handle the join result - leads is an array with one item
    const lead = Array.isArray(property.leads) ? property.leads[0] : property.leads;
    return {
      ...property,
      lead: lead || null,
    };
  });

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        {/* Header */}
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">Properties</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">Property Map</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            View all properties with geocoded addresses on an interactive map.
          </p>
        </header>

        <PropertiesClient initialProperties={propertiesWithLeads} />
      </div>
    </main>
  );
}
