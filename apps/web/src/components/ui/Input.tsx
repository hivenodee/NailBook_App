"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = {
  label?: string;
  helper?: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({
  label,
  helper,
  error,
  className,
  id,
  ref,
  ...rest
}: InputProps): React.JSX.Element {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-sans font-medium text-ink-700"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 px-4 text-base font-sans text-ink-900",
          "bg-cream-50 border rounded-md",
          "placeholder:text-ink-300",
          "transition-colors duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-error" : "border-ink-300 hover:border-ink-500",
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-xs font-sans text-error">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-xs font-sans text-ink-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
