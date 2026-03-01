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
      <body className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="font-display text-2xl text-text-primary">Something went wrong</h2>
          <p className="text-text-secondary">We&apos;ve been notified and are looking into it.</p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
