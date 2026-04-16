import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacy Policy | Rush N Dush",
  description: "Privacy Policy for Rush N Dush Logistics - How we collect, use, and protect your personal information.",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex flex-col items-start gap-1">
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
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary-gold)] hover:decoration-[var(--color-primary-gold)]"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-navy)] sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Last Updated: April 15, 2026
        </p>

        <div className="prose prose-slate mt-8 max-w-none">
          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Introduction</h2>
            <p className="text-[var(--color-muted)] leading-7">
              This Privacy Policy describes how Rush N Dush (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects your personal information when you use our real estate lead services, including text message (SMS) communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">Information You Provide</h3>
            <p className="text-[var(--color-muted)] leading-7">When you submit a property inquiry through our website, we collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li>Full name</li>
              <li>Phone number</li>
              <li>Street address, city, and state</li>
              <li>Property type and details</li>
              <li>Repair needs and timeline preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">Automatic Information</h3>
            <p className="text-[var(--color-muted)] leading-7">We may automatically collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li>IP address and browser information</li>
              <li>Device information</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">How We Use Your Information</h2>
            <p className="text-[var(--color-muted)] leading-7">We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li>Process your property sale inquiries</li>
              <li>Send you SMS notifications about your inquiry status</li>
              <li>Contact you via phone or text to discuss your property</li>
              <li>Provide customer service and support</li>
              <li>Improve our services</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">SMS Communications</h3>
            <p className="text-[var(--color-muted)] leading-7">
              <strong>Please note:</strong> We do not send SMS/text messages to customers. Your phone number is only used for our team to contact you directly via voice calls. SMS notifications are sent internally to our admin team when a new property inquiry is submitted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Sharing Your Information</h2>
            <p className="text-[var(--color-muted)] leading-7">We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li><strong>Twilio</strong> - Our SMS service provider, for delivering text messages</li>
              <li><strong>Service providers</strong> - Third parties who assist in our operations (e.g., database hosting, analytics)</li>
              <li><strong>Legal authorities</strong> - When required by law or to protect our rights</li>
            </ul>

            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">Third-Party Service Providers</h3>
            <p className="text-[var(--color-muted)] leading-7">
              We use Twilio for internal admin notifications and voice call services. Twilio&apos;s privacy practices are governed by their privacy policy available at <a href="https://www.twilio.com/legal/privacy" className="text-[var(--color-primary-gold)] underline" target="_blank" rel="noopener noreferrer">https://www.twilio.com/legal/privacy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Your Rights and Choices</h2>
            
            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">Communication Preferences</h3>
            <p className="text-[var(--color-muted)] leading-7">
              Since we do not send SMS messages to customers, there is no SMS opt-out needed. If you prefer not to be contacted by phone, please let us know when you submit your inquiry or contact us using the information below.
            </p>

            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">Access and Deletion</h3>
            <p className="text-[var(--color-muted)] leading-7">You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal obligations)</li>
              <li>Withdraw consent for processing where applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Data Security</h2>
            <p className="text-[var(--color-muted)] leading-7">We implement reasonable security measures to protect your information, including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li>Encryption of data in transit and at rest</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments</li>
              <li>Secure third-party service providers (Supabase, Twilio)</li>
            </ul>
            <p className="text-[var(--color-muted)] leading-7 mt-3">
              However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Data Retention</h2>
            <p className="text-[var(--color-muted)] leading-7">We retain your information for as long as:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li>Your inquiry is active or under consideration</li>
              <li>Required by law or for legitimate business purposes</li>
              <li>Typically 2 years from last contact, unless you request earlier deletion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Children&apos;s Privacy</h2>
            <p className="text-[var(--color-muted)] leading-7">
              Our services are not directed to individuals under 18. We do not knowingly collect information from minors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Changes to This Policy</h2>
            <p className="text-[var(--color-muted)] leading-7">
              We may update this Privacy Policy periodically. Changes will be posted on this page with an updated &quot;Last Updated&quot; date. Continued use of our services after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mt-8 mb-4">Contact Us</h2>
            <p className="text-[var(--color-muted)] leading-7">For questions about this Privacy Policy or to exercise your rights, contact us:</p>
            <div className="mt-3 text-[var(--color-muted)]">
              <p className="font-semibold text-[var(--color-navy)]">Rush N Dush</p>
              <p>Email: privacy@rushndush.com</p>
              <p>Phone: (720) 897-5219</p>
            </div>
          </section>

          <section className="border-t border-black/10 pt-8 mt-12">
            <h2 className="text-2xl font-bold text-[var(--color-navy)] mb-4">State-Specific Rights</h2>
            
            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">California Residents (CCPA/CPRA)</h3>
            <p className="text-[var(--color-muted)] leading-7">California residents have additional rights including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--color-muted)]">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale (we do not sell your information)</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>

            <h3 className="text-xl font-semibold text-[var(--color-navy)] mt-6 mb-3">Other States</h3>
            <p className="text-[var(--color-muted)] leading-7">
              Residents of Virginia, Colorado, Connecticut, and other states with privacy laws may have similar rights. Contact us to exercise these rights.
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-black/8 bg-white px-4 py-6 text-center text-sm text-[var(--color-muted)]">
        <p>© {new Date().getFullYear()} Rush N Dush Logistics, LLC. All rights reserved.</p>
      </footer>
    </main>
  );
}
