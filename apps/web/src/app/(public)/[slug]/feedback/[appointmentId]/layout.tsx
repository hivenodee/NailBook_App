import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leave feedback",
  description: "Anonymous feedback for your provider. Takes a minute.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
