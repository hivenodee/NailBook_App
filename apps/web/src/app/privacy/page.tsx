import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — NailBook",
};

export default function PrivacyPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <h1 className="font-display text-3xl">Privacy Policy</h1>
        <p className="text-sm text-text-muted">Last updated: February 2026</p>

        <section className="space-y-3">
          <h2 className="font-display text-xl">1. Information We Collect</h2>
          <p className="text-text-secondary leading-relaxed">
            When you use NailBook, we collect information you provide directly: your name,
            email address, phone number, and payment information. For providers, we also
            collect business details, portfolio images, and service information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">2. How We Use Your Information</h2>
          <p className="text-text-secondary leading-relaxed">
            We use your information to facilitate bookings, process payments, send appointment
            reminders, and communicate with you about your account. We do not sell your
            personal information to third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">3. Payment Processing</h2>
          <p className="text-text-secondary leading-relaxed">
            Payments are processed securely through Stripe. NailBook does not store your
            full credit card information. All payment data is handled in accordance with
            PCI DSS standards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">4. Data Sharing</h2>
          <p className="text-text-secondary leading-relaxed">
            We share necessary booking information between clients and their selected
            providers. We use third-party services for email notifications, SMS reminders,
            and payment processing. These services only receive the data necessary to
            perform their functions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">5. Data Retention</h2>
          <p className="text-text-secondary leading-relaxed">
            We retain appointment and payment records for legal and business purposes.
            You may request deletion of your account and personal data by contacting us.
            Certain records may be retained as required by law or for legitimate business purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">6. Security</h2>
          <p className="text-text-secondary leading-relaxed">
            We implement appropriate technical and organizational measures to protect
            your personal data against unauthorized access, alteration, disclosure, or
            destruction.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">7. Your Rights</h2>
          <p className="text-text-secondary leading-relaxed">
            You have the right to access, correct, or delete your personal data. You may
            also opt out of marketing communications at any time. To exercise these rights,
            please contact us at the email address below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">8. Contact</h2>
          <p className="text-text-secondary leading-relaxed">
            For privacy-related questions or requests, contact us at{" "}
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
