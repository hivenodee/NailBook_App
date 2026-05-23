import * as React from "react";
import { PageTransition } from "@/components/layout/PageTransition";

// `template.tsx` re-mounts on every navigation within this segment,
// which is what we want for fade + 8px slide page transitions.
// (Layouts persist; templates do not.)
export default function PublicTemplate({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <PageTransition>{children}</PageTransition>;
}
