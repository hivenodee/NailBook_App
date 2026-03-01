"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: 40, fontFamily: "system-ui" }}>
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred. Our team has been notified.</p>
        </div>
      </body>
    </html>
  );
}
