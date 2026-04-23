import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin, isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "./admin-nav";

export default async function AdminDashboardPage() {
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

  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  // Fetch key metrics
  const [leadsResult, appointmentsResult, pendingRequestsResult, reviewsResult, voicemailsResult] = await Promise.all([
    queryClient.from("leads").select("id, status, isHotLead, created_at").is("deleted_at", null).order("created_at", { ascending: false }),
    queryClient.from("appointments").select("id, status, start_time").order("start_time", { ascending: false }),
    queryClient.from("appointment_requests").select("id, status").eq("status", "pending"),
    queryClient.from("reviews").select("id, is_approved").eq("is_approved", false),
    queryClient.from("voicemails").select("id, is_read"),
  ]);

  const leads = leadsResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];
  const pendingRequests = pendingRequestsResult.data ?? [];
  const unapprovedReviews = reviewsResult.data ?? [];
  const voicemails = voicemailsResult.data ?? [];

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.toISOString();

  const newLeadsToday = leads.filter((lead) => lead.created_at >= todayTimestamp).length;
  const hotLeads = leads.filter((lead) => lead.isHotLead).length;
  const qualifiedLeads = leads.filter((lead) => lead.status === "qualified").length;

  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.start_time) > new Date() && apt.status === "scheduled"
  ).length;

  const unreadVoicemails = voicemails.filter((vm) => !vm.is_read).length;

  // Check if user is a super admin
  const isUserSuperAdmin = isSuperAdmin(user.email);

  // Check feature flags (available to all admins if enabled)
  const showSocialMediaIntegration = await isFeatureEnabled("social_media_integration");
  const showAutodialer = await isFeatureEnabled("autodialer", user.email);

  const actionItems = [
    { count: pendingRequests.length, label: "Pending Appointment Requests", href: "/admin/appointments", urgent: pendingRequests.length > 0 },
    { count: unapprovedReviews.length, label: "Reviews Awaiting Approval", href: "/admin/reviews", urgent: false },
    { count: hotLeads, label: "Hot Leads to Follow Up", href: "/admin/leads", urgent: hotLeads > 0 },
    { count: upcomingAppointments, label: "Upcoming Appointments", href: "/admin/appointments", urgent: false },
  ].filter((item) => item.count > 0);

  const adminTools = [
    {
      title: "Leads",
      description: "Manage seller leads, contact info, and follow-ups",
      href: "/admin/leads",
      icon: "📋",
      stats: `${leads.length} total • ${qualifiedLeads} qualified`,
    },
    {
      title: "Appointments",
      description: "View and manage property viewing appointments",
      href: "/admin/appointments",
      icon: "📅",
      stats: `${upcomingAppointments} upcoming • ${pendingRequests.length} pending`,
    },
    {
      title: "Reviews",
      description: "Approve and manage customer testimonials",
      href: "/admin/reviews",
      icon: "⭐",
      stats: `${unapprovedReviews.length} awaiting approval`,
    },
    {
      title: "Voicemails",
      description: "Listen to and manage voicemail messages",
      href: "/admin/voicemails",
      icon: "🎤",
      stats: `${unreadVoicemails} unread messages`,
    },
    {
      title: "Settings",
      description: "Manage lead sources, phone, appointments, and questions",
      href: "/admin/settings",
      icon: "⚙️",
      stats: "System configuration",
    },
  ];

  // Add Feature Flags for super admins only
  if (isUserSuperAdmin) {
    adminTools.push({
      title: "Feature Flags",
      description: "Control which features are enabled system-wide",
      href: "/admin/feature-flags",
      icon: "🚩",
      stats: "Super admin only",
    });
  }

  // Add Social Media Integration if feature flag is enabled
  if (showSocialMediaIntegration) {
    adminTools.push({
      title: "Social Media Integration",
      description: "Connect and manage social media accounts",
      href: "/admin/social-integrations",
      icon: "📱",
      stats: "Coming soon",
    });
  }

  // Add Autodialer if feature flag is enabled
  if (showAutodialer) {
    adminTools.push({
      title: "Autodialer",
      description: "Multi-agent automated outbound calling campaigns",
      href: "/admin/dialer",
      icon: "📞",
      stats: "Campaign management",
    });
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        {/* Header */}
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">Admin Dashboard</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Here's what's happening with your business today.
          </p>
        </header>

        {/* Quick Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">New Today</p>
            <p className="mt-2 text-3xl font-black text-[var(--color-navy)]">{newLeadsToday}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">leads submitted</p>
          </div>

          <div className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Hot Leads</p>
            <p className="mt-2 text-3xl font-black text-[var(--color-navy)]">{hotLeads}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">priority follow-ups</p>
          </div>

          <div className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Qualified</p>
            <p className="mt-2 text-3xl font-black text-[var(--color-navy)]">{qualifiedLeads}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">ready to convert</p>
          </div>

          <div className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Appointments</p>
            <p className="mt-2 text-3xl font-black text-[var(--color-navy)]">{upcomingAppointments}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">scheduled upcoming</p>
          </div>
        </div>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mb-6 rounded-[1.4rem] border border-amber-200 bg-amber-50 p-6">
            <h2 className="mb-4 text-lg font-bold text-amber-900">⚡ Action Required</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {actionItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg p-4 transition-all ${
                    item.urgent
                      ? "border-2 border-red-300 bg-white shadow-md hover:shadow-lg"
                      : "border border-amber-300 bg-white hover:shadow-md"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-[var(--color-navy)]">{item.label}</p>
                    {item.urgent && <span className="mt-1 inline-block text-xs font-bold text-red-600">URGENT</span>}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-gold)] text-lg font-black text-[var(--color-navy)]">
                    {item.count}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Admin Tools Grid */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-[var(--color-navy)]">Admin Tools</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adminTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all hover:border-[var(--color-primary-gold)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-3 text-4xl">{tool.icon}</div>
                <h3 className="text-lg font-bold text-[var(--color-navy)] group-hover:text-[var(--color-primary-gold)]">
                  {tool.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{tool.description}</p>
                <p className="mt-3 text-xs font-semibold text-[var(--color-accent)]">{tool.stats}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
