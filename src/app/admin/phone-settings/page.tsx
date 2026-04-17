import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminNav from "../admin-nav";
import PhoneSettingsClient from "./phone-settings-client";

export default async function PhoneSettingsPage() {
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

  // Fetch phone settings and availability
  const [settingsResult, availabilityResult] = await Promise.all([
    queryClient.from("phone_settings").select("*").limit(1).single(),
    queryClient.from("phone_availability").select("*").order("day_of_week", { ascending: true }),
  ]);

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">Phone System</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">Phone Settings</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage call forwarding, availability hours, and voicemail settings
          </p>
        </header>

        <PhoneSettingsClient
          initialSettings={settingsResult.data}
          initialAvailability={availabilityResult.data || []}
        />
      </div>
    </main>
  );
}
