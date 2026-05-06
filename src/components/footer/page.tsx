import Image from "next/image";
import SecretAdminLink from "@/components/SecretAdminLink";
import { primaryLinks } from "../nav/page";

export default function Footer() {
    return( <footer className="border-t border-black/8 bg-white px-4 py-8 text-[var(--color-ink)] hidden md:block lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="Rush N Dush Logistics LLC logo"
                width={80}
                height={33}
                className="h-8 w-auto rounded object-contain"
              />
              <p className="text-xs font-bold text-[var(--color-muted)]">
                <SecretAdminLink />{" "}
                {new Date().getFullYear()} Rush N Dush Logistics, LLC
              </p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-[var(--color-muted)]">
              {primaryLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="underline decoration-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary-gold)] hover:decoration-[var(--color-primary-gold)]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/privacy"
                className="underline decoration-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary-gold)] hover:decoration-[var(--color-primary-gold)]"
              >
                Privacy
              </a>
              <a
                href="https://loveondev.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 underline decoration-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary-gold)] hover:decoration-[var(--color-primary-gold)]"
              >
                <span>Crafted with</span>
                <Image
                  src="/lod.ico"
                  alt="LoveOnDev"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </a>
            </nav>
          </div>
        </div>
      </footer>)
}