"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const isActive = (path: string) => pathname === path;

  // Fetch pending appointments count
  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const response = await fetch("/api/admin/appointment-requests");
        if (response.ok) {
          const data = await response.json();
          const pending = data.appointmentRequests.filter(
            (req: { status: string }) => req.status === "pending"
          ).length;
          setPendingCount(pending);
        }
      } catch (error) {
        console.error("Failed to fetch pending count:", error);
      }
    }
    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: "/admin/leads", label: "Leads", group: "ops", badge: null },
    { path: "/admin/appointments", label: "Appointments", group: "ops", badge: pendingCount > 0 ? pendingCount : null },
    { path: "/admin/appointments/settings", label: "Settings", group: "ops", badge: null, isSubItem: true },
    { path: "/admin/questions", label: "Questions", group: "config", badge: null },
    { path: "/admin/reviews", label: "Reviews", group: "config", badge: null },
  ];

  return (
    <nav className="sticky top-4 z-10 mb-6">
      <div className="rounded-xl border border-black/[0.08] bg-white/95 shadow-sm backdrop-blur-sm">
        {/* Desktop Navigation */}
        <div className="hidden items-center justify-between px-3 py-2.5 md:flex">
          {/* Main Navigation */}
          <div className="flex items-center gap-1">
            {navItems.map((item, idx) => {
              const showDivider = idx > 0 && navItems[idx - 1].group !== item.group;
              return (
                <div key={item.path} className="flex items-center gap-1">
                  {showDivider && (
                    <div className="mx-1 h-5 w-px bg-black/10" />
                  )}
                  <Link
                    href={item.path}
                    className={`relative rounded-lg px-3 py-1.5 text-sm transition-all ${
                      (item as any).isSubItem ? "font-normal" : "font-semibold"
                    } ${
                      isActive(item.path)
                        ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)] shadow-sm"
                        : "text-[var(--color-navy)]/70 hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
                    }`}
                  >
                    {(item as any).isSubItem && "↳ "}{item.label}
                    {item.badge && (
                      <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Home Link */}
          <Link
            href="/admin/leads"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
            title="Back to leads"
          >
            ← Admin Home
          </Link>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--color-navy)] transition-all hover:bg-black/[0.04]"
              aria-label="Toggle menu"
            >
              <svg
                className="h-5 w-5"
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

            <Link
              href="/admin/leads"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
              title="Back to leads"
            >
              ← Admin Home
            </Link>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="border-t border-black/[0.08] px-3 py-2">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between rounded-lg py-2 text-sm transition-all ${
                      (item as any).isSubItem ? "pl-6 pr-3 font-normal" : "px-3 font-semibold"
                    } ${
                      isActive(item.path)
                        ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)] shadow-sm"
                        : "text-[var(--color-navy)]/70 hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
                    }`}
                  >
                    <span>{(item as any).isSubItem && "↳ "}{item.label}</span>
                    {item.badge && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
