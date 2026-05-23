import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay your balance",
  description: "Complete payment for your appointment.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
