"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="mb-6 rounded-[1.4rem] border border-black/6 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-1 p-2 sm:flex-row sm:items-center">
        {/* Operations Section */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <span className="px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] sm:py-0">
            Operations
          </span>
          <Link
            href="/admin/leads"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isActive("/admin/leads")
                ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)]"
                : "text-[var(--color-navy)] hover:bg-black/5"
            }`}
          >
            Leads
          </Link>
          <Link
            href="/admin/calendar"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isActive("/admin/calendar")
                ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)]"
                : "text-[var(--color-navy)] hover:bg-black/5"
            }`}
          >
            Calendar
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-2 hidden h-6 w-px bg-black/10 sm:block" />

        {/* Settings Section */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <span className="px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] sm:py-0">
            Settings
          </span>
          <Link
            href="/admin/questions"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isActive("/admin/questions")
                ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)]"
                : "text-[var(--color-navy)] hover:bg-black/5"
            }`}
          >
            Questions
          </Link>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Home Link */}
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-black/5"
        >
          ← Home
        </Link>
      </div>
    </nav>
  );
}
