import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import PushRegistration from "@/components/PushRegistration";

export const dynamic = "force-dynamic";

async function getProvider(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { provider: true },
  });
  return user?.provider ?? null;
}

async function getBadgeCounts(providerId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [today, money, waitlist, feedback] = await Promise.all([
    prisma.appointment.count({
      where: {
        providerId,
        startTime: { gte: startOfToday, lt: endOfToday },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
    }),
    prisma.payment.count({
      where: {
        appointment: { providerId },
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.waitlistEntry.count({
      where: {
        providerId,
        status: "ACTIVE",
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.feedback.count({
      where: {
        providerId,
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
  ]);

  return { today, money, waitlist, feedback };
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

  const badges = await getBadgeCounts(provider.id);

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-grid-2 flex items-center h-14 gap-grid-2">
          <Link href="/dashboard" className="font-semibold text-lg flex-shrink-0">
            NailBook
          </Link>
          <DashboardNav badges={badges} />
        </div>
      </nav>
      <PushRegistration />
      <main className="max-w-3xl mx-auto px-grid-2 py-grid-3">
        {children}
      </main>
    </div>
  );
}
