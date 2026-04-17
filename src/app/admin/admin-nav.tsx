"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [hotLeads, setHotLeads] = useState(0);

  // Fetch key metrics
  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Fetch pending appointment requests
        const requestsResponse = await fetch("/api/admin/appointment-requests");
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          const pending = requestsData.appointmentRequests.filter(
            (req: { status: string }) => req.status === "pending"
          ).length;
          setPendingCount(pending);
        }

        // Fetch upcoming appointments
        const appointmentsResponse = await fetch("/api/admin/appointments");
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          const upcoming = appointmentsData.appointments.filter(
            (apt: { start_time: string; status: string }) =>
              new Date(apt.start_time) > new Date() && apt.status === "scheduled"
          ).length;
          setUpcomingAppointments(upcoming);
        }

        // Fetch hot leads
        const leadsResponse = await fetch("/api/admin/leads");
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          const hot = leadsData.leads.filter(
            (lead: { isHotLead: boolean }) => lead.isHotLead
          ).length;
          setHotLeads(hot);
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      }
    }
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-4 z-10 mb-6">
      <div className="rounded-xl border border-black/[0.08] bg-white/95 shadow-sm backdrop-blur-sm">
        {/* Desktop Navigation */}
        <div className="hidden items-center justify-between px-3 py-2.5 md:flex">
          {/* Logo */}
          <Link href="/" className="mr-4 flex-shrink-0" title="Go to home">
            <Image
              src="/logo.png"
              alt="Rush N Dush Logistics"
              width={80}
              height={33}
              className="h-8 w-auto rounded object-contain"
            />
          </Link>
          
          {/* Quick Metrics */}
          <div className="flex items-center gap-2">
            <Link
              href="/admin/appointments"
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                pendingCount > 0
                  ? "bg-red-50 hover:bg-red-100"
                  : "bg-green-50 hover:bg-green-100"
              }`}
              title="View pending appointment requests"
            >
              <span className={`text-sm font-semibold ${
                pendingCount > 0 ? "text-red-700" : "text-green-700"
              }`}>⚡ {pendingCount}</span>
              <span className={`hidden text-xs lg:inline ${
                pendingCount > 0 ? "text-red-600" : "text-green-600"
              }`}>pending</span>
            </Link>
            <Link
              href="/admin/appointments"
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                upcomingAppointments > 0
                  ? "bg-blue-50 hover:bg-blue-100"
                  : "bg-green-50 hover:bg-green-100"
              }`}
              title="View upcoming appointments"
            >
              <span className={`text-sm font-semibold ${
                upcomingAppointments > 0 ? "text-blue-700" : "text-green-700"
              }`}>📅 {upcomingAppointments}</span>
              <span className={`hidden text-xs lg:inline ${
                upcomingAppointments > 0 ? "text-blue-600" : "text-green-600"
              }`}>upcoming</span>
            </Link>
            <Link
              href="/admin/leads"
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                hotLeads > 0
                  ? "bg-orange-50 hover:bg-orange-100"
                  : "bg-green-50 hover:bg-green-100"
              }`}
              title="View hot leads"
            >
              <span className={`text-sm font-semibold ${
                hotLeads > 0 ? "text-orange-700" : "text-green-700"
              }`}>🔥 {hotLeads}</span>
              <span className={`hidden text-xs lg:inline ${
                hotLeads > 0 ? "text-orange-600" : "text-green-600"
              }`}>hot leads</span>
            </Link>
          </div>

          {/* Exit & Home Link */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
              title="Exit to homepage"
            >
              Exit →
            </Link>
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
              title="Back to dashboard"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-3 py-2.5">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0" title="Go to home">
              <Image
                src="/logo.png"
                alt="Rush N Dush Logistics"
                width={68}
                height={28}
                className="h-7 w-auto rounded object-contain"
              />
            </Link>
            
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
                title="Exit to homepage"
              >
                Exit →
              </Link>
              
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-navy)] transition-all hover:bg-black/[0.04]"
                aria-label="Toggle menu"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
                Menu
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="border-t border-black/[0.08] px-3 py-2">
              <div className="flex flex-col gap-1">
                {pathname !== "/admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
                  >
                    ← Dashboard
                  </Link>
                )}
                {/* Quick Metrics in mobile menu */}
                <Link
                  href="/admin/appointments"
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-all ${
                    pendingCount > 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-green-50 hover:bg-green-100"
                  }`}
                >
                  <span className={`text-sm font-semibold ${
                    pendingCount > 0 ? "text-red-700" : "text-green-700"
                  }`}>⚡ {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span>
                </Link>
                <Link
                  href="/admin/appointments"
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-all ${
                    upcomingAppointments > 0
                      ? "bg-blue-50 hover:bg-blue-100"
                      : "bg-green-50 hover:bg-green-100"
                  }`}
                >
                  <span className={`text-sm font-semibold ${
                    upcomingAppointments > 0 ? "text-blue-700" : "text-green-700"
                  }`}>📅 {upcomingAppointments} upcoming appointment{upcomingAppointments !== 1 ? 's' : ''}</span>
                </Link>
                <Link
                  href="/admin/leads"
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-all ${
                    hotLeads > 0
                      ? "bg-orange-50 hover:bg-orange-100"
                      : "bg-green-50 hover:bg-green-100"
                  }`}
                >
                  <span className={`text-sm font-semibold ${
                    hotLeads > 0 ? "text-orange-700" : "text-green-700"
                  }`}>🔥 {hotLeads} hot lead{hotLeads !== 1 ? 's' : ''}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
