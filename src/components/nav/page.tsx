export const primaryLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#why-us", label: "Why Us" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];
export default function Nav() {
    return (<>
     <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--color-muted)] md:flex" data-testid="navigation">
                {primaryLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="underline decoration-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary-gold)] hover:decoration-[var(--color-primary-gold)]"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              
    </>)
}

 