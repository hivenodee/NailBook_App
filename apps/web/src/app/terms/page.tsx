import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — NailBook",
};

export default function TermsPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <h1 className="font-display text-3xl">Terms of Service</h1>
        <p className="text-sm text-text-muted">Last updated: February 2026</p>

        <section className="space-y-3">
          <h2 className="font-display text-xl">1. Acceptance of Terms</h2>
          <p className="text-text-secondary leading-relaxed">
            By using NailBook, you agree to these Terms of Service. If you do not agree,
            please do not use the platform. We may update these terms from time to time,
            and continued use constitutes acceptance of any changes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">2. Service Description</h2>
          <p className="text-text-secondary leading-relaxed">
            NailBook is a platform connecting nail service providers with clients. We
            facilitate booking, scheduling, and payment processing. NailBook is not a
            party to the service agreement between providers and clients.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">3. User Accounts</h2>
          <p className="text-text-secondary leading-relaxed">
            You are responsible for maintaining the confidentiality of your account
            credentials. You agree to provide accurate information and to notify us
            immediately of any unauthorized use of your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">4. Booking & Payments</h2>
          <p className="text-text-secondary leading-relaxed">
            Deposits and payments are processed through Stripe. Cancellation and refund
            policies are set by individual providers and displayed at the time of booking.
            NailBook is not responsible for the quality of services provided by providers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">5. Provider Responsibilities</h2>
          <p className="text-text-secondary leading-relaxed">
            Providers are responsible for maintaining accurate service listings, availability,
            pricing, and cancellation policies. Providers must comply with all applicable
            local laws and licensing requirements for their services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">6. Client Responsibilities</h2>
          <p className="text-text-secondary leading-relaxed">
            Clients agree to arrive on time for appointments, provide accurate contact
            information, and comply with provider cancellation policies. No-shows may
            result in forfeiture of deposits as specified by the provider.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">7. Prohibited Conduct</h2>
          <p className="text-text-secondary leading-relaxed">
            Users may not use NailBook for any unlawful purpose, attempt to gain
            unauthorized access to the platform, harass other users, or submit false
            or misleading information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">8. Limitation of Liability</h2>
          <p className="text-text-secondary leading-relaxed">
            NailBook provides the platform &ldquo;as is&rdquo; and makes no warranties
            regarding the availability or reliability of the service. Our liability is
            limited to the fees paid to NailBook, if any.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">9. Dispute Resolution</h2>
          <p className="text-text-secondary leading-relaxed">
            Disputes between providers and clients should be resolved directly between
            the parties. NailBook may assist in mediation but is not obligated to do so.
            Payment disputes related to Stripe transactions are subject to Stripe&apos;s
            dispute resolution process.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">10. Contact</h2>
          <p className="text-text-secondary leading-relaxed">
            For questions about these terms, contact us at{" "}
            <a href="mailto:support@nailbook.app" className="text-primary underline">
              support@nailbook.app
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
