import Image from "next/image";
import { FaHouseChimneyWindow, FaBusinessTime, FaHandshakeAngle } from "react-icons/fa6";
import TestimonialCarousel from "./testimonial-carousel";
import Footer from "../components/footer/page";
import Header from "../components/header/page";


const benefits = [
  {
    title: "Easy To Start",
    description: "To get started, we invite you to answer a few brief questions on our website.",
    Icon: FaHouseChimneyWindow,
  },
  {
    title: "Timely Response",
    description: "A member of our team will contact you within 24 hours of your inquiry to discuss your situation and explore the best options available to you.",
    Icon: FaBusinessTime,
  },
  {
    title: "Local & Trusted",
    description: "We look forward to helping you achieve a timely sale and a fair solution tailored to your needs.",
    Icon: FaHandshakeAngle,
  },
];

const steps = [
  {
    number: "1",
    title: "Tell Us About Your Property",
    description: "Fill out a quick form with basic details about your house. Takes less than 3 minutes.",
  },
  {
    number: "2",
    title: "Get a Fair Cash Offer",
    description: "We'll review your property and send you a no-obligation cash offer within 24 hours.",
  },
  {
    number: "3",
    title: "Choose Your Closing Date",
    description: "Pick a timeline that works for you—whether that's 7 days or 3 months from now.",
  },
  {
    number: "4",
    title: "Close & Get Paid",
    description: "Walk away with cash in hand. No repairs, no showings, no waiting.",
  },
];


export default function Home() {
  const twilioPhone = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "(720) 897-5219";
  const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE || "(720) 897-5219";
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "rushndushlogistics@gmail.com";

  return (
    <main id="top" className="text-[var(--color-ink)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[var(--color-primary-gold)] focus:px-4 focus:py-2 focus:text-[var(--color-navy)] focus:font-bold">
        Skip to main content
      </a>
      <Header />

      <section id="main-content"
        data-nav-section
        className="relative overflow-hidden bg-[linear-gradient(135deg,var(--color-navy)_0%,#112547_60%,#0d1c35_100%)]"
      >
        <div className="absolute inset-0 md:inset-y-0 md:right-[-2px] md:left-auto w-full md:w-[calc(52vw+2px)] opacity-30 md:opacity-100">
          <Image
            src="/house.jpg"
            alt="House exterior for the hero section"
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-contain object-center"
          />
          <div className="pointer-events-none absolute inset-0 md:inset-y-0 md:-left-[50px] w-full md:w-[226px] lg:w-[274px] bg-gradient-to-b md:bg-gradient-to-r from-[#112547] via-[#112547]/70 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-2 md:max-w-[44%]">
            <h1 className="max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              A Simple, <span className="text-[var(--color-primary-gold)]">Fair</span> Way to Sell Your Home?
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              At Rush N Dush Logistics, we put homeowners first.  If you need to sell quickly or want a
              stress-free option, we're here to provide a clear, honest solution - with no repairs,
              no hidden fees, and no pressure.
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Answer a few quick questions to get started.  We'll reach out within 24 hours.
            </p>
            <div className="mt-9 hidden md:block">
              <a
                href="/get-cash-offer"
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary-gold)] px-6 py-3.5 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
              >
                Get Your Cash Offer
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="why-us"
        data-nav-section
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">Why homeowners trust us</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--color-navy)] sm:text-4xl">
            Thank you for visiting our website.
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            We understand that when you need to sell
            your home quickly, choosing the right company matters. With so many options
            available today, it’s important to work with a team that truly puts customers first.
          </p>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            At Rush N Dush Logistics, our mission is simple: prioritize your needs, provide transparent communication, and deliver
            dependable solutions. We believe our success is built on the trust and satisfaction of the homeowners
            we serve.
          </p>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="p-1 text-center">
              <benefit.Icon
                className="mx-auto text-3xl text-[var(--color-primary-gold)]"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-xl font-bold text-[var(--color-navy)]">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works"
        data-nav-section className="bg-[var(--color-navy)] py-14 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-brand)]">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Four simple steps to sell your house fast
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

      <section id="about"
        data-nav-section
        className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20"
      >
        <div className="rounded-[2rem] bg-white p-7 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">About us</p>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            We started this business in 2025 with one simple goal — to help people who need a real solution when it comes to
            selling their home. Over the past year, we’ve truly enjoyed working with homeowners and being part of their journey.
          </p>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            We’ve seen firsthand that selling a house isn’t always just about the house. Sometimes it’s about going through a divorce,
            facing foreclosure, inheriting a parent’s property, relocating for a new job, or trying to avoid bankruptcy. Those situations
            can feel overwhelming, and having someone guide you through the process makes a big difference.
          </p>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            That’s why we’re here — to listen, to help, and to make things a little easier during a stressful time.
          </p>
        </div>

        <TestimonialCarousel />
      </section>

      <section id="contact"
        data-nav-section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 rounded-[2.2rem] bg-[linear-gradient(135deg,var(--color-brand)_0%,#d59d32_100%)] p-6 text-[var(--color-navy)] shadow-[0_22px_60px_rgba(208,157,50,0.28)] lg:grid-cols-[1fr_0.9fr] lg:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-navy)]/70">Ready to get started</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Get your no-obligation cash offer today
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-navy)]/80">
              Submit your property details and receive a fair cash offer within 24 hours. No pressure, no obligations—just a straightforward path to selling your house on your terms.
            </p>
          </div>
          <div className="rounded-[1.8rem] bg-[var(--color-navy)] p-6 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-brand)]">Contact us</p>
            <div className="mt-5 space-y-3 text-sm text-white/78">
              <p>{contactPhone}</p>
              <p>{contactEmail}</p>
              <p>Serving local homeowners and off-market opportunities</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={`tel:${twilioPhone.replace(/\D/g, '')}`}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[var(--color-navy)]"
                aria-label={`Call us at ${twilioPhone}`}
              >
                Call Now
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center justify-center rounded-full border border-white/16 px-5 py-3 text-sm font-bold text-white"
                aria-label={`Email us at ${contactEmail}`}
              >
                Email Team
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
