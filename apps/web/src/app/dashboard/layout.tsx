import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getProvider(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { provider: true },
  });
  return user?.provider ?? null;
}

export default async function DashboardLayout({
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}): Promise<React.JSX.Element> {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const provider = await getProvider(userId);
  if (!provider) redirect("/");

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-grid-2 flex items-center justify-between h-14">
          <Link href="/dashboard" className="font-semibold text-lg">
            NailBook
          </Link>
          <div className="flex gap-grid-2">
            <NavLink href="/dashboard">Today</NavLink>
            <NavLink href="/dashboard/history">History</NavLink>
            <NavLink href="/dashboard/clients">Clients</NavLink>
            <NavLink href="/dashboard/services">Services</NavLink>
            <NavLink href="/dashboard/availability">Hours</NavLink>
            <NavLink href="/dashboard/money">Money</NavLink>
            <NavLink href="/dashboard/portfolio">Portfolio</NavLink>
            <NavLink href="/dashboard/waitlist">Waitlist</NavLink>
            <NavLink href="/dashboard/feedback">Feedback</NavLink>
            <NavLink href="/dashboard/messages">Messages</NavLink>
            <NavLink href="/dashboard/coupons">Coupons</NavLink>
            <NavLink href="/dashboard/profile">Profile</NavLink>
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-grid-2 py-grid-3">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: string }): React.JSX.Element {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-text-muted hover:text-text-secondary transition-colors px-2 py-1"
    >
      {children}
    </Link>
  );
}
