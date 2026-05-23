"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="max-w-md text-center space-y-4 px-6">
          <h2 className="font-display text-3xl text-ink-900">Something went wrong</h2>
          <p className="font-sans text-base text-ink-500">
            We've been notified and are looking into it.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-11 px-5 text-base font-sans font-medium bg-rust-500 text-cream-50 border border-rust-500 rounded-md transition-all duration-200 hover:bg-rust-600 hover:border-rust-600 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
