"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: "h-6 w-6",           text: "text-[10px]" }, // 24px
  md: { box: "h-9 w-9",           text: "text-sm"     }, // 36px
  lg: { box: "h-12 w-12",         text: "text-base"   }, // 48px
  xl: { box: "h-[72px] w-[72px]", text: "text-xl"     }, // 72px
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type AvatarProps = {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  ring?: boolean;
  ref?: React.Ref<HTMLSpanElement>;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">;

export function Avatar({
  src,
  name,
  size = "md",
  ring = false,
  className,
  ref,
  ...rest
}: AvatarProps): React.JSX.Element {
  const { box, text } = SIZES[size];
  const initials = getInitials(name);
  const [errored, setErrored] = React.useState(false);

  // Reset error state when src changes so a new url gets a fresh attempt.
  React.useEffect(() => {
    setErrored(false);
  }, [src]);

  const showImage = Boolean(src) && !errored;

  return (
    <span
      ref={ref}
      role="img"
      aria-label={name}
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 overflow-hidden",
        "rounded-pill bg-cream-100 text-ink-700 font-sans font-medium select-none",
        ring && "ring-2 ring-rust-500 ring-offset-2 ring-offset-cream-50",
        box,
        text,
        className,
      )}
      {...rest}
    >
      {/* Initials always sit underneath; image (if any) is layered on top. */}
      {/* When the image loads, it covers them. When it fails, it unmounts and they show. */}
      <span aria-hidden="true">{initials}</span>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          aria-hidden="true"
          onError={() => setErrored(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}
