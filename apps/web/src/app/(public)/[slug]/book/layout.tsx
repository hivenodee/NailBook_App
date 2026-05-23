import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Pick your service, your time, and you are set. No app required.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
