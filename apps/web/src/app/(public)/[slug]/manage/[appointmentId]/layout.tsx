import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage booking",
  description: "Reschedule or cancel your appointment.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
