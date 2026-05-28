import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import {
  Playfair_Display,
  DM_Sans,
  Josefin_Sans,
  Cormorant_Garamond,
} from "next/font/google";
import "@/styles/globals.css";
import { Logo } from "@/components/ui/Logo";
import { validateEnv } from "@/lib/env";

// Self-hosted fonts via next/font — no render-blocking external requests
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-label",
  weight: ["100", "200", "300", "400", "600"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-accent",
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Validate environment variables at startup.
// Wrapped in try/catch so missing vars during `next build` on CI won't crash the build.
try {
  validateEnv();
} catch (e) {
  // Error is already logged inside validateEnv — nothing more to do at build time.
}

export const metadata: Metadata = {
  title: {
    default: "PoroBook — Where Black Beauty Gets Booked",
    template: "%s — PoroBook",
  },
  description:
    "Editorial-grade booking for Black beauty professionals. Pick a service, pick a time, you're done.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://porobook.app",
  ),
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1614" },
  ],
  openGraph: {
    type: "website",
    siteName: "PoroBook",
    title: "PoroBook — Where Black Beauty Gets Booked",
    description:
      "Editorial-grade booking for Black beauty professionals. Pick a service, pick a time, you're done.",
    images: [
      {
        url: "/brand/editorial-hands-marble.jpeg",
        width: 1920,
        height: 1080,
        alt: "Hands on Carrara marble with tortoiseshell and rust nail art",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PoroBook — Where Black Beauty Gets Booked",
    description:
      "Editorial-grade booking for Black beauty professionals. Pick a service, pick a time, you're done.",
    images: ["/brand/editorial-hands-marble.jpeg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ClerkProvider>
      <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${josefin.variable} ${cormorant.variable}`} suppressHydrationWarning>
        <body>
          {children}
          <footer className="border-t border-ink-200 bg-cream-50 py-6 text-center">
            <div className="flex justify-center mb-2">
              <Logo size="lg" showTagline />
            </div>
            <div className="flex items-center justify-center gap-4 text-xs font-sans text-ink-500">
              <a href="/privacy" className="hover:text-rust-500 transition-colors">Privacy policy</a>
              <span className="w-1 h-1 rounded-pill bg-ink-200" />
              <a href="/terms" className="hover:text-rust-500 transition-colors">Terms of service</a>
              <span className="w-1 h-1 rounded-pill bg-ink-200" />
              <a href="/explore" className="hover:text-rust-500 transition-colors">Explore</a>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
