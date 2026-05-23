import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking confirmed",
  description: "Your appointment is locked in. Add to calendar or share with a friend.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
