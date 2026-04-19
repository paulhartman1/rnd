import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../admin-nav";

export default async function AdminSettingsPage() {
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

  const showPushNotifications = await isFeatureEnabled("pwa_push_notifications");

  // Fetch lightweight counts for each settings section
  const [sourcesResult, phoneSettingsResult, appointmentTypesResult, questionsResult] =
    await Promise.all([
      queryClient.from("sources").select("id, is_active"),
      queryClient.from("phone_settings").select("is_forwarding_enabled").limit(1).maybeSingle(),
      queryClient.from("appointment_types").select("id, is_active"),
      queryClient.from("intake_questions").select("id, is_active").is("deleted_at", null),
    ]);

  const sources = sourcesResult.data ?? [];
  const appointmentTypes = appointmentTypesResult.data ?? [];
  const questions = questionsResult.data ?? [];
  const phoneSettings = phoneSettingsResult.data;

  const activeSources = sources.filter((s) => s.is_active).length;
  const activeAppointmentTypes = appointmentTypes.filter((t) => t.is_active).length;
  const activeQuestions = questions.filter((q) => q.is_active).length;

  const settingsCards = [
    {
      title: "Lead Sources",
      description: "Manage where your leads come from",
      href: "/admin/settings/sources",
      icon: "📋",
      stats: `${activeSources} active • ${sources.length} total`,
    },
    {
      title: "Phone Settings",
      description: "Configure call forwarding and voicemail",
      href: "/admin/phone-settings",
      icon: "📞",
      stats: phoneSettings?.is_forwarding_enabled ? "Forwarding enabled" : "Forwarding disabled",
    },
    {
      title: "Appointment Settings",
      description: "Manage appointment types, availability, and blackout dates",
      href: "/admin/appointments/settings",
      icon: "📅",
      stats: `${activeAppointmentTypes} active types`,
    },
    {
      title: "Questions",
      description: "Manage intake form questions for lead capture",
      href: "/admin/questions",
      icon: "❓",
      stats: `${activeQuestions} active • ${questions.length} total`,
    },
  ];

  if (showPushNotifications) {
    settingsCards.push({
      title: "Notifications",
      description: "Manage push notifications and alerts",
      href: "/admin/settings/notifications",
      icon: "🔔",
      stats: "Configure alerts",
    });
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Admin Settings
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            System Settings
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage lead sources, phone settings, and appointment configurations
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all hover:border-[var(--color-primary-gold)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
            >
              <div className="mb-3 text-4xl">{card.icon}</div>
              <h3 className="text-lg font-bold text-[var(--color-navy)] group-hover:text-[var(--color-primary-gold)]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{card.description}</p>
              <p className="mt-3 text-xs font-semibold text-[var(--color-accent)]">{card.stats}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
