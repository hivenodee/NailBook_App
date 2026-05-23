import type { Metadata } from "next";
import { Heading } from "@/components/ui/Heading";

export const metadata: Metadata = {
  title: "Terms of service — PoroBook",
};

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body:
      "By using PoroBook, you agree to these Terms of Service. If you do not agree, please do not use the platform. We may update these terms from time to time, and continued use constitutes acceptance of any changes.",
  },
  {
    title: "2. Service description",
    body:
      "PoroBook is a platform connecting beauty service providers with clients. We facilitate booking, scheduling, and payment processing. PoroBook is not a party to the service agreement between providers and clients.",
  },
  {
    title: "3. User accounts",
    body:
      "You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and to notify us immediately of any unauthorized use of your account.",
  },
  {
    title: "4. Booking & payments",
    body:
      "Deposits and payments are processed through Stripe. Cancellation and refund policies are set by individual providers and displayed at the time of booking. PoroBook is not responsible for the quality of services provided by providers.",
  },
  {
    title: "5. Provider responsibilities",
    body:
      "Providers are responsible for maintaining accurate service listings, availability, pricing, and cancellation policies. Providers must comply with all applicable local laws and licensing requirements for their services.",
  },
  {
    title: "6. Client responsibilities",
    body:
      "Clients agree to arrive on time for appointments, provide accurate contact information, and comply with provider cancellation policies. No-shows may result in forfeiture of deposits as specified by the provider.",
  },
  {
    title: "7. Prohibited conduct",
    body:
      "Users may not use PoroBook for any unlawful purpose, attempt to gain unauthorized access to the platform, harass other users, or submit false or misleading information.",
  },
  {
    title: "8. Limitation of liability",
    body:
      "PoroBook provides the platform “as is” and makes no warranties regarding the availability or reliability of the service. Our liability is limited to the fees paid to PoroBook, if any.",
  },
  {
    title: "9. Dispute resolution",
    body:
      "Disputes between providers and clients should be resolved directly between the parties. PoroBook may assist in mediation but is not obligated to do so. Payment disputes related to Stripe transactions are subject to Stripe's dispute resolution process.",
  },
];

export default function TermsPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-2">
          <Heading variant="display" className="text-3xl sm:text-4xl">Terms of service</Heading>
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
            <Heading variant="h4" className="text-xl">10. Contact</Heading>
            <p className="font-sans text-base text-ink-700 leading-relaxed">
              For questions about these terms, contact us at{" "}
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
