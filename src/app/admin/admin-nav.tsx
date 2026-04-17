"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { path: "/admin/leads", label: "Leads", group: "ops" },
    { path: "/admin/calendar", label: "Calendar", group: "ops" },
    { path: "/admin/questions", label: "Questions", group: "config" },
    { path: "/admin/reviews", label: "Reviews", group: "config" },
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
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                      isActive(item.path)
                        ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)] shadow-sm"
                        : "text-[var(--color-navy)]/70 hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Home Link */}
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
            title="Back to home"
          >
            ← Home
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
              href="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
              title="Back to home"
            >
              ← Home
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
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                      isActive(item.path)
                        ? "bg-[var(--color-primary-gold)] text-[var(--color-navy)] shadow-sm"
                        : "text-[var(--color-navy)]/70 hover:bg-black/[0.04] hover:text-[var(--color-navy)]"
                    }`}
                  >
                    {item.label}
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
