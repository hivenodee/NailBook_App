import type { Metadata } from "next";
import { Heading } from "@/components/ui/Heading";

export const metadata: Metadata = {
  title: "Privacy policy — PoroBook",
};

const SECTIONS = [
  {
    title: "1. Information we collect",
    body:
      "When you use PoroBook, we collect information you provide directly: your name, email address, phone number, and payment information. For providers, we also collect business details, portfolio images, and service information.",
  },
  {
    title: "2. How we use your information",
    body:
      "We use your information to facilitate bookings, process payments, send appointment reminders, and communicate with you about your account. We do not sell your personal information to third parties.",
  },
  {
    title: "3. Payment processing",
    body:
      "Payments are processed securely through Stripe. PoroBook does not store your full credit card information. All payment data is handled in accordance with PCI DSS standards.",
  },
  {
    title: "4. Data sharing",
    body:
      "We share necessary booking information between clients and their selected providers. We use third-party services for email notifications, SMS reminders, and payment processing. These services only receive the data necessary to perform their functions.",
  },
  {
    title: "5. Data retention",
    body:
      "We retain appointment and payment records for legal and business purposes. You may request deletion of your account and personal data by contacting us. Certain records may be retained as required by law or for legitimate business purposes.",
  },
  {
    title: "6. Security",
    body:
      "We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.",
  },
  {
    title: "7. Your rights",
    body:
      "You have the right to access, correct, or delete your personal data. You may also opt out of marketing communications at any time. To exercise these rights, please contact us at the email address below.",
  },
];

export default function PrivacyPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-2">
          <Heading variant="display" className="text-3xl sm:text-4xl">Privacy policy</Heading>
          <p className="font-sans text-sm text-ink-500">Last updated: February 2026</p>
        </header>

        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-3">
              <Heading variant="h4" className="text-xl">{s.title}</Heading>
              <p className="font-sans text-base text-ink-700 leading-relaxed">{s.body}</p>
            </section>
          ))}

          <section className="space-y-3 pt-6 border-t border-ink-100">
            <Heading variant="h4" className="text-xl">8. Contact</Heading>
            <p className="font-sans text-base text-ink-700 leading-relaxed">
              For privacy-related questions or requests, contact us at{" "}
              <a
                href="mailto:support@porobook.app"
                className="text-rust-500 underline underline-offset-2 hover:text-rust-600"
              >
                support@porobook.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
