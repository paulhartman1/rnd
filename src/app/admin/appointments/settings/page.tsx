import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "../../admin-nav";
import AppointmentSettingsClient from "./settings-client";

export default async function AppointmentSettingsPage() {
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

  const adminSupabase = createAdminClient();

  if (!adminSupabase) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Server configuration error. Missing SUPABASE_SERVICE_ROLE_KEY.
        </div>
      </main>
    );
  }

  // Fetch all settings data
  const [typesResult, availabilityResult, blackoutsResult, requestsResult] =
    await Promise.all([
      adminSupabase.from("appointment_types").select("*").order("display_order"),
      adminSupabase.from("availability_windows").select("*").order("day_of_week"),
      adminSupabase.from("blackout_periods").select("*").order("start_time"),
      adminSupabase
        .from("appointment_requests")
        .select(`
          *,
          appointment_type:appointment_types!appointment_type_id (
            id,
            name,
            default_duration_minutes
          )
        `)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Appointment Settings
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Manage Appointments
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Configure appointment types, availability, blackout periods, and review requests.
          </p>
        </header>

        <AppointmentSettingsClient
          initialTypes={typesResult.data || []}
          initialAvailability={availabilityResult.data || []}
          initialBlackouts={blackoutsResult.data || []}
          initialRequests={
            (requestsResult.data || []).map((req) => ({
              ...req,
              appointment_type:
                Array.isArray(req.appointment_type) && req.appointment_type.length > 0
                  ? req.appointment_type[0]
                  : req.appointment_type || null,
            }))
          }
        />
      </div>
    </main>
  );
}
