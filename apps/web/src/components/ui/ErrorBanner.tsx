import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Inline error banner for fetch failures and form-level errors.
 * Canonical style: rounded-md, error-tinted background + border, ink-error text.
 */
export type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorBanner({
  message,
  onRetry,
  className,
}: ErrorBannerProps): React.JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-error/30 bg-error/10 px-4 py-3",
        "flex items-start gap-2",
        className,
      )}
    >
      <AlertCircle
        size={16}
        className="text-error mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <p className="flex-1 text-sm font-sans text-error">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-sans font-medium text-error hover:underline shrink-0"
        >
          Try again
        </button>
      )}
    </div>
  );
}
