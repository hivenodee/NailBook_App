import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover providers",
  description: "Find Black beauty professionals near you. Browse portfolios, read reviews, book in seconds.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
