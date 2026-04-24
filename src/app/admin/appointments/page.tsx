import { redirect } from "next/navigation";
import { type AppointmentWithLead } from "@/lib/appointments";
import { type LeadRow } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "../admin-nav";
import CalendarClient from "./calendar-client";

export default async function AdminCalendarPage() {
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

  // Use admin client for data fetching to ensure consistency with API routes
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

  const { data: appointmentsData, error: appointmentsError } = await adminSupabase
    .from("appointments")
    .select(
      `
      id,
      lead_id,
      user_id,
      title,
      description,
      start_time,
      end_time,
      status,
      location,
      created_at,
      updated_at,
      lead:leads!lead_id (
        id,
        full_name,
        email,
        phone,
        street_address
      )
    `,
    )
    .order("start_time", { ascending: true });

  const appointments = (appointmentsData ?? []).map((apt) => ({
    ...apt,
    lead: Array.isArray(apt.lead) && apt.lead.length > 0 ? apt.lead[0] : apt.lead || null,
  })) as AppointmentWithLead[];

  const { data: leadsData } = await adminSupabase
    .from("leads")
    .select(
      "id, status, owner_notes, listed_with_agent, property_type, owns_land, repairs_needed, close_timeline, sell_reason, acceptable_offer, street_address, city, state, postal_code, full_name, email, phone, sms_consent, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  const leads = (leadsData ?? []) as LeadRow[];

  // Fetch appointment requests
  const { data: requestsData } = await adminSupabase
    .from("appointment_requests")
    .select(`
      *,
      appointment_type:appointment_types!appointment_type_id (
        id,
        name,
        default_duration_minutes
      )
    `)
    .order("created_at", { ascending: false });

  const requests = (requestsData ?? []).map((req) => ({
    ...req,
    appointment_type:
      Array.isArray(req.appointment_type) && req.appointment_type.length > 0
        ? req.appointment_type[0]
        : req.appointment_type || null,
  }));

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Appointments
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Appointments & Requests
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage appointment requests, scheduled appointments, and follow-ups.
          </p>
        </header>

        {appointmentsError ? (
          <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load appointments. Confirm the `appointments` table and
            RLS policies are applied.
          </div>
        ) : (
          <CalendarClient 
            initialAppointments={appointments} 
            allLeads={leads}
            initialRequests={requests}
          />
        )}
      </div>
    </main>
  );
}
