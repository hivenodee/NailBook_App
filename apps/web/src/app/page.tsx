"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { Instagram, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { Logo } from "@/components/ui/Logo";
import { FastBookingArt } from "@/components/ui/value-art/FastBookingArt";
import { SecurePaymentArt } from "@/components/ui/value-art/SecurePaymentArt";
import { NoAppArt } from "@/components/ui/value-art/NoAppArt";

// ─── Motion presets ────────────────────────────────────────────
// Per SKILL: 300ms ease-out fade + 8px slide-up; 50ms stagger.
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

// ─── Data ──────────────────────────────────────────────────────
// Featured-provider data is illustrative for the static landing.
// Real data should come from /api/providers/search.
const FEATURED_PROVIDERS = [
  {
    name: "Imani Brooks",
    slug: "imani-brooks",
    specialty: "Sculpted gel art",
    location: "Brooklyn, NY",
    rating: 4.9,
    photo: "/brand/editorial-portrait-salon-young.jpeg",
  },
  {
    name: "Maya Johnson",
    slug: "maya-johnson",
    specialty: "Volume lash extensions",
    location: "Atlanta, GA",
    rating: 4.8,
    photo: "/brand/editorial-portrait-lashes.jpeg",
  },
  {
    name: "Zora Henderson",
    slug: "zora-henderson",
    specialty: "Editorial nail design",
    location: "Los Angeles, CA",
    rating: 5.0,
    photo: "/brand/editorial-portrait-salon.jpeg",
  },
  {
    name: "Ava Williams",
    slug: "ava-williams",
    specialty: "Brow architecture",
    location: "Chicago, IL",
    rating: 4.9,
    photo: "/brand/editorial-mirror-selfie-02.jpeg",
  },
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Browse",
    description:
      "Find providers near you by style, availability, and the work in their portfolio.",
    photo: "/brand/editorial-salon-interior.jpeg",
    alt: "Salon interior with arched windows and rust velvet styling chairs",
  },
  {
    n: "02",
    title: "Book",
    description:
      "Pick a service and a time. Pay your deposit. Get a confirmation in seconds.",
    photo: "/brand/editorial-hands-cup-02.jpeg",
    alt: "Hands cradling a cream-and-rust ceramic cup, gold-leaf nail art",
  },
  {
    n: "03",
    title: "Glow up",
    description:
      "Show up, get the work, walk out. We handle the rest behind the scenes.",
    photo: "/brand/editorial-leaving-salon.jpeg",
    alt: "Sitter caught mid-laugh leaving a glass storefront, fresh manicure",
  },
] as const;

// ─── Page ──────────────────────────────────────────────────────
export default function HomePage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      <SiteNav />
      <Hero />
      <ValueProps />
      <FeaturedProviders />
      <HowItWorks />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

// ─── Sections ──────────────────────────────────────────────────

function SiteNav(): React.JSX.Element {
  return (
    <nav className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between">
      <Logo />
      <div className="flex items-center gap-6 text-sm font-sans">
        <Link
          href="/explore"
          className="text-ink-700 hover:text-ink-900 transition-colors"
        >
          Explore
        </Link>
        <Link
          href="/dashboard"
          className="text-ink-700 hover:text-ink-900 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}

function Hero(): React.JSX.Element {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Translate the hero image up to 60px down as the user scrolls the first
  // 600px of the page. Disabled when the user prefers reduced motion.
  const parallaxY = useTransform(scrollY, [0, 600], [0, 60]);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 md:pb-32">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Text — second on mobile, first on desktop */}
        <motion.div
          className="order-2 md:order-1 space-y-6"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Heading variant="display" className="text-5xl md:text-6xl lg:text-7xl">
              Your next chapter,<br />
              <span className="text-rust-500">booked in minutes</span>.
            </Heading>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="font-sans text-lg text-ink-500 max-w-md leading-relaxed"
          >
            PoroBook connects you with Black beauty professionals who treat
            their craft like an art form. Find your next provider, book in
            seconds, and walk in already glowing.
          </motion.p>

          <motion.div variants={fadeUp}>
            <Link href="/explore">
              <Button variant="primary" size="lg">
                Find a provider
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Image — first on mobile (full-width above headline), right column on desktop */}
        <motion.div
          className="order-1 md:order-2 relative aspect-[4/5] md:aspect-auto md:h-[640px] rounded-md overflow-hidden"
          style={reduce ? undefined : { y: parallaxY }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Image
            src="/brand/editorial-hands-cup.jpeg"
            alt="Two hands cradling a cream stoneware mug, golden-hour rim light, fresh nail art"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}

function ValueProps(): React.JSX.Element {
  const items = [
    {
      art: <FastBookingArt className="text-rust-500" />,
      title: "Book in 60 seconds",
      body:
        "Pick a service, pick a time, you're done. No back-and-forth, no waiting on a callback.",
    },
    {
      art: <SecurePaymentArt className="text-rust-500" />,
      title: "Stripe payments",
      body:
        "Card, Apple Pay, Cash App. Deposits held safely until your appointment is confirmed.",
    },
    {
      art: <NoAppArt className="text-rust-500" />,
      title: "No app needed",
      body:
        "Open your provider's link, book, and you're set. Save it for next time.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        {items.map((item) => (
          <motion.div
            key={item.title}
            variants={fadeUp}
            className="bg-cream-50 border border-ink-200 rounded-md p-8 transition-all duration-200 hover:-translate-y-px hover:border-ink-300"
          >
            <div className="mb-6">{item.art}</div>
            <Heading variant="h3" as="h2">{item.title}</Heading>
            <p className="font-sans text-base text-ink-500 mt-2 leading-relaxed">
              {item.body}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function FeaturedProviders(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="mb-10 md:mb-14 max-w-xl">
          <p className="text-xs font-sans uppercase tracking-wide text-rust-500 mb-3">
            Featured
          </p>
          <Heading variant="h1" as="h2">Providers worth the trip.</Heading>
          <p className="mt-4 font-sans text-base text-ink-500 leading-relaxed">
            A curated handful of artists shaping the standard. New names added
            every week.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {FEATURED_PROVIDERS.map((p) => (
            <motion.article
              key={p.slug}
              variants={fadeUp}
              className="group bg-cream-50 border border-ink-200 rounded-md overflow-hidden transition-all duration-200 hover:-translate-y-px hover:border-ink-300"
            >
              <Link href={`/${p.slug}`} className="block">
                <div className="relative aspect-[4/5]">
                  <Image
                    src={p.photo}
                    alt={`${p.name}, ${p.specialty}, ${p.location}`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="p-5">
                  <Heading variant="h4" as="h3">
                    {p.name}
                  </Heading>
                  <p className="mt-1 font-sans text-sm text-ink-500">
                    {p.specialty}
                  </p>
                  <div className="mt-4 flex items-center justify-between font-sans text-sm">
                    <span className="inline-flex items-center gap-1 text-ink-900">
                      <Star
                        className="h-3.5 w-3.5 text-rust-500"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                      {p.rating.toFixed(1)}
                    </span>
                    <span className="text-ink-500">{p.location}</span>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function HowItWorks(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="mb-12 md:mb-16 max-w-xl">
          <p className="text-xs font-sans uppercase tracking-wide text-rust-500 mb-3">
            How it works
          </p>
          <Heading variant="h1" as="h2">Three steps, no friction.</Heading>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {HOW_IT_WORKS.map((step) => (
            <motion.div key={step.n} variants={fadeUp} className="space-y-5">
              <div className="relative aspect-[4/5] rounded-md overflow-hidden border border-ink-200">
                <Image
                  src={step.photo}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-2">
                <p className="font-display text-2xl text-ink-200 leading-none">
                  {step.n}
                </p>
                <Heading variant="h3">{step.title}</Heading>
                <p className="font-sans text-base text-ink-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function FinalCta(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-36">
      <motion.div
        className="max-w-2xl mx-auto text-center space-y-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
      >
        <motion.div variants={fadeUp}>
          <Heading variant="display" as="h2" className="text-4xl md:text-5xl lg:text-6xl">
            Ready to find your<br />
            <span className="text-rust-500">next provider?</span>
          </Heading>
        </motion.div>
        <motion.p
          variants={fadeUp}
          className="font-sans text-base md:text-lg text-ink-500 leading-relaxed"
        >
          Browse the full directory. New artists added weekly.
        </motion.p>
        <motion.div variants={fadeUp} className="pt-2">
          <Link href="/explore">
            <Button variant="primary" size="lg">
              Find a provider
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

function SiteFooter(): React.JSX.Element {
  const cols = [
    {
      heading: "For clients",
      links: [
        { label: "Find a provider", href: "/explore" },
        { label: "How it works", href: "/#how-it-works" },
        { label: "Reviews", href: "/explore" },
      ],
    },
    {
      heading: "For providers",
      links: [
        { label: "Become a provider", href: "/dashboard" },
        { label: "Provider sign in", href: "/dashboard" },
        { label: "Resources", href: "/dashboard" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "Contact", href: "mailto:support@porobook.app" },
      ],
    },
  ];

  return (
    <footer className="border-t border-ink-200 mt-12">
      <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
        <div className="space-y-4">
          <Logo />
          <p className="font-sans text-sm text-ink-500 leading-relaxed max-w-[260px]">
            Editorial-grade booking for Black beauty professionals.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <Link
              href="https://instagram.com"
              aria-label="Instagram"
              className="text-ink-700 hover:text-rust-500 transition-colors"
            >
              <Instagram className="h-5 w-5" strokeWidth={1.5} />
            </Link>
            <Link
              href="https://tiktok.com"
              aria-label="TikTok"
              className={cn(
                "text-ink-700 hover:text-rust-500 transition-colors",
                "text-sm font-sans",
              )}
            >
              TikTok
            </Link>
          </div>
        </div>

        {cols.map((col) => (
          <div key={col.heading} className="space-y-4">
            <p className="text-xs font-sans uppercase tracking-wide text-ink-500">
              {col.heading}
            </p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-sans text-sm text-ink-700 hover:text-rust-500 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-200">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs text-ink-500">
          <p>© {new Date().getFullYear()} PoroBook</p>
          <p>Made for the craft.</p>
        </div>
      </div>
    </footer>
  );
}
