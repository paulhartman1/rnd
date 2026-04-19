import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../../admin-nav";
import PushNotificationToggle from "@/components/admin/PushNotificationToggle";

export default async function AdminNotificationSettingsPage() {
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

  const showPushNotifications = await isFeatureEnabled("pwa_push_notifications");

  if (!showPushNotifications) {
    redirect("/admin/settings");
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <Link
            href="/admin/settings"
            className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] transition hover:text-[var(--color-navy)]"
          >
            ← Back to Settings
          </Link>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Admin Settings
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Notifications
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Manage how you receive alerts for new leads and important events
          </p>
        </header>

        <div className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="space-y-6">
            <PushNotificationToggle />

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">💡 About Notifications</h3>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                <li>• Push notifications work in your mobile browser - no app needed</li>
                <li>• Each device you enable will receive notifications independently</li>
                <li>• Notifications are sent instantly when new leads arrive</li>
                <li>• You can disable notifications anytime from this page</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Other Notification Methods</h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-lg">📧</span>
                  <div>
                    <p className="font-semibold text-gray-900">Email Notifications</p>
                    <p className="text-gray-600">
                      Configured via environment variables (ADMIN_NOTIFICATION_EMAIL)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-lg">📱</span>
                  <div>
                    <p className="font-semibold text-gray-900">SMS Notifications</p>
                    <p className="text-gray-600">
                      Configured via environment variables (ADMIN_NOTIFICATION_PHONE)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
