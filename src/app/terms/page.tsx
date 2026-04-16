import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Rush N Dush Logistics",
  description: "Terms and conditions for using Rush N Dush Logistics services.",
};

export default function TermsAndConditions() {
  return (
    <main className="min-h-screen bg-[var(--color-surface)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-[var(--color-navy)] mb-8">
          Terms and Conditions
        </h1>

        <div className="prose prose-sm max-w-none text-[var(--color-muted)] space-y-6">
          <p className="text-sm text-gray-500">
            Last Updated: April 16, 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using the Rush N Dush Logistics website and services, you accept and agree 
              to be bound by the terms and provisions of this agreement. If you do not agree to these 
              terms, please do not use this website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              2. Use of Service
            </h2>
            <p>
              Rush N Dush Logistics provides a platform for property owners to submit information about 
              properties they wish to sell. By submitting your information through our website, you:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Confirm that you are the property owner or authorized representative</li>
              <li>Agree to provide accurate and complete information</li>
              <li>Understand that submission does not constitute an offer or guarantee of purchase</li>
              <li>Acknowledge that Rush N Dush Logistics will evaluate your property and may or may not make an offer</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              3. Privacy and Data Collection
            </h2>
            <p>
              We collect personal information including but not limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Name and contact information (email, phone number)</li>
              <li>Property address and details</li>
              <li>Information about your property's condition and sale preferences</li>
            </ul>
            <p className="mt-4">
              This information is used solely for the purpose of evaluating your property and contacting 
              you regarding a potential purchase. We do not sell or share your personal information with 
              third parties except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              4. SMS and Communication Consent
            </h2>
            <p>
              By providing your phone number and submitting this form, you consent to receive:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Phone calls regarding your property inquiry</li>
              <li>Text messages (SMS) related to your property sale</li>
              <li>Follow-up communications about offers and property evaluations</li>
            </ul>
            <p className="mt-4">
              You may opt out of SMS communications at any time by replying STOP to any message. 
              Message and data rates may apply. Message frequency varies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              5. No Obligation to Purchase
            </h2>
            <p>
              Submission of your property information does not obligate Rush N Dush Logistics to make an 
              offer on your property. All offers are made at Rush N Dush Logistics' sole discretion based 
              on property evaluation, market conditions, and business criteria.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              6. No Fees to Sellers
            </h2>
            <p>
              Rush N Dush Logistics does not charge fees to property owners for submitting information 
              or receiving offers. There are no obligations or costs associated with using our service 
              unless you choose to accept an offer and proceed with a sale.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              7. Property Information Accuracy
            </h2>
            <p>
              You are responsible for the accuracy of all information provided about your property. 
              Misrepresentation of property details, ownership status, or condition may result in 
              withdrawal of any offer made by Rush N Dush Logistics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              8. Limitation of Liability
            </h2>
            <p>
              Rush N Dush Logistics shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of or inability to use the service. Our total 
              liability shall not exceed $100.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              9. Intellectual Property
            </h2>
            <p>
              All content on this website, including text, graphics, logos, and software, is the property 
              of Rush N Dush Logistics and protected by copyright and trademark laws. You may not reproduce, 
              distribute, or create derivative works without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              10. Modifications to Terms
            </h2>
            <p>
              Rush N Dush Logistics reserves the right to modify these terms at any time. Changes will be 
              effective immediately upon posting to the website. Your continued use of the service after 
              changes are posted constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              11. Governing Law
            </h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the State 
              of Colorado, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] mt-8 mb-4">
              12. Contact Information
            </h2>
            <p>
              For questions about these Terms and Conditions, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Rush N Dush Logistics LLC</strong><br />
              Email: rushndushlogistics@gmail.com<br />
              Phone: (720) 897-5219<br />
              Website: rushndushlogistics.com
            </p>
          </section>

          <section className="border-t border-gray-200 pt-6 mt-8">
            <p className="text-sm text-gray-600">
              By using this website and submitting your information, you acknowledge that you have read, 
              understood, and agree to be bound by these Terms and Conditions.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a 
            href="/"
            className="text-[var(--color-primary-gold)] hover:text-[var(--color-accent)] font-medium transition"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
