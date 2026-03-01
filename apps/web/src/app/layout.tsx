import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NailBook — Book Your Nail Appointment",
  description:
    "Book nail appointments instantly from your favorite nail techs. No app required.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
          <footer className="border-t border-border/30 bg-background py-4 text-center text-xs text-text-muted">
            <a href="/privacy" className="hover:text-text-primary transition-colors">Privacy Policy</a>
            <span className="mx-2">&middot;</span>
            <a href="/terms" className="hover:text-text-primary transition-colors">Terms of Service</a>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
