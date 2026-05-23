import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leave a tip",
  description: "Send a tip to your provider.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
