import Image from "next/image";
import NavCtaLink from "./nav-cta-link";

const primaryLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#why-us", label: "Why Us" },
  { href: "#faqs", label: "FAQs" },
  { href: "#contact", label: "Contact" },
];

const benefits = [
  {
    title: "Any Condition",
    description: "Inherited homes, dated interiors, repairs, liens, or vacancy—we buy as-is.",
    iconClass: "fa-solid fa-house-chimney-window",
  },
  {
    title: "Close Fast",
    description: "Move from intake to signed offer quickly with a process built for speed.",
    iconClass: "fa-solid fa-business-time",
  },
  {
    title: "No Hidden Fees",
    description: "No commissions, no cleanup crews, and no surprise closing charges.",
    iconClass: "fa-solid fa-money-bill-1-wave",
  },
  {
    title: "Local & Trusted",
    description: "A straightforward, relationship-first experience for sellers who need clarity.",
    iconClass: "fa-solid fa-handshake-angle",
  },
];

const steps = [
  {
    number: "1",
    title: "Tell Us About the Property",
    description: "Submit a quick lead form from your phone and share the basics.",
  },
  {
    number: "2",
    title: "Get a Cash Offer",
    description: "We review the deal and follow up fast with a no-obligation offer.",
  },
  {
    number: "3",
    title: "Pick a Closing Date",
    description: "Choose a timeline that works for the seller, agent, or probate situation.",
  },
  {
    number: "4",
    title: "Close & Move Forward",
    description: "Get paid without repairs, open houses, or extended back-and-forth.",
  },
];

const faqs = [
  {
    question: "Do you buy houses that need repairs?",
    answer: "Yes. We are set up for as-is purchases, including deferred maintenance and cleanup issues.",
  },
  {
    question: "How quickly can we close?",
    answer: "Many deals can move quickly, but the seller controls the final closing timeline.",
  },
  {
    question: "Will this connect to a CRM later?",
    answer: "Yes. This landing page is structured as a strong front-end foundation for a future CRM and telephony workflow.",
  },
];

export default function Home() {
  return (
    <main id="top" className="bg-[var(--color-surface)] text-[var(--color-ink)]">
      <header id="site-nav" className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex flex-col items-start gap-1">
            <Image
              src="/logo.png"
              alt="Rush N Dush Logistics LLC logo"
              width={136}
              height={56}
              className="h-10 w-auto rounded-md object-contain sm:h-12"
            />
            <p className="text-xs font-extrabold leading-tight tracking-tight text-[var(--color-navy)] sm:text-sm">
              Rush N Dush Logistics
            </p>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--color-muted)] md:flex">
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
              href="/admin/login"
              className="underline decoration-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary-gold)] hover:decoration-[var(--color-primary-gold)]"
            >
              Admin Login
            </a>
          </nav>
          <NavCtaLink />
        </div>
      </header>
      <section
        data-nav-section
        className="relative overflow-hidden bg-[linear-gradient(135deg,var(--color-navy)_0%,#112547_60%,#0d1c35_100%)]"
      >
        <div className="absolute inset-y-0 right-[-2px] hidden w-[calc(52vw+2px)] md:block">
          <Image
            src="/house.jpg"
            alt="House exterior for the hero section"
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover object-center scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-y-0 -left-[50px] w-[226px] bg-gradient-to-r from-[#112547] via-[#112547]/70 to-transparent lg:w-[274px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-14 md:max-w-[44%] lg:py-20">
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Need to sell your house <span className="text-[var(--color-primary-gold)]">fast</span>?
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              No repairs, no hidden fees, and no waiting game. Get a clear cash offer and
              choose a closing date that works for you.
            </p>
            <div className="mt-9 hidden flex-wrap gap-3 md:flex">
              <a
                href="/get-cash-offer"
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary-gold)] px-6 py-3.5 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
              >
                Get Your Cash Offer
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="why-us"
        data-nav-section
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">Why sellers choose us</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)] sm:text-4xl">
            We make selling your house easier on mobile and faster behind the scenes
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            The visual direction follows your reference image while positioning the product for future CRM workflows, call handling, and fast lead response.
          </p>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="p-1 text-center">
              <i
                className={`${benefit.iconClass} block text-3xl text-[var(--color-primary-gold)]`}
                aria-hidden="true"
              />
              <h3 className="mt-4 text-xl font-bold text-[var(--color-navy)]">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" data-nav-section className="bg-[var(--color-navy)] py-14 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-brand)]">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              A clean path from lead capture to close
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => (
              <article key={step.number} className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-lg font-black text-[var(--color-navy)]">
                  {step.number}
                </div>
                <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/72">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        data-nav-section
        className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20"
      >
        <div className="rounded-[2rem] bg-white p-7 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">About the platform</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)] sm:text-4xl">
            Designed like a landing page now, structured like a CRM later
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            This direction supports a public-facing acquisition site while anticipating the next phase:
            mobile-first admin tools, seller pipelines, and telephony integrations through Twilio or a similar provider.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] bg-[var(--color-surface-soft)] p-4">
              <p className="text-sm font-bold text-[var(--color-navy)]">Future admin views</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Lead status, callbacks, offer tracking, and seller notes on mobile.</p>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--color-surface-soft)] p-4">
              <p className="text-sm font-bold text-[var(--color-navy)]">Future telephony</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Click-to-call, SMS follow-up, call logging, and routing-ready UX.</p>
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] bg-[linear-gradient(180deg,#fff_0%,#f8f4ea_100%)] p-7 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">Client story</p>
          <blockquote className="mt-5 text-lg leading-8 text-[var(--color-navy)]">
            “Rush N Dush made a stressful sale feel straightforward. The process was fast, the offer was clear, and communication stayed simple the entire way.”
          </blockquote>
          <p className="mt-5 text-sm font-bold text-[var(--color-muted)]">— Sarah M., homeowner</p>
          <div className="mt-8 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
          </div>
        </aside>
      </section>

      <section id="faqs" data-nav-section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">FAQs</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-[1.5rem] border border-black/6 bg-[var(--color-surface-soft)] p-5">
                <h3 className="text-base font-bold text-[var(--color-navy)]">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" data-nav-section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 rounded-[2.2rem] bg-[linear-gradient(135deg,var(--color-brand)_0%,#d59d32_100%)] p-6 text-[var(--color-navy)] shadow-[0_22px_60px_rgba(208,157,50,0.28)] lg:grid-cols-[1fr_0.9fr] lg:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-navy)]/70">Ready to launch</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Ready to turn this into a full home-buyer CRM?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-navy)]/80">
              This landing page now supports the visual tone, mobile hierarchy, and conversion flow needed for the next step: intake forms, admin actions, and call/text follow-up.
            </p>
          </div>
          <div className="rounded-[1.8rem] bg-[var(--color-navy)] p-6 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-brand)]">Contact block</p>
            <div className="mt-5 space-y-3 text-sm text-white/78">
              <p>(123) 456-7890</p>
              <p>offers@rushndush.com</p>
              <p>Serving local homeowners and off-market opportunities</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="tel:1234567890"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[var(--color-navy)]"
              >
                Call Now
              </a>
              <a
                href="mailto:offers@rushndush.com"
                className="inline-flex items-center justify-center rounded-full border border-white/16 px-5 py-3 text-sm font-bold text-white"
              >
                Email Team
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/8 bg-white px-4 py-8 text-[var(--color-ink)] sm:px-6 lg:px-8">
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
                © {new Date().getFullYear()} Rush N Dush Logistics, LLC
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
                href="/admin/login"
                className="underline decoration-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary-gold)] hover:decoration-[var(--color-primary-gold)]"
              >
                Admin Login
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
