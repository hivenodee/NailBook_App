import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SidebarNav from "@/components/layout/SidebarNav";
import { PageTransition } from "@/components/layout/PageTransition";
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

  const [today, appointments, money, waitlist, feedback] = await Promise.all([
    prisma.appointment.count({
      where: {
        providerId,
        startTime: { gte: startOfToday, lt: endOfToday },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
    }),
    prisma.appointment.count({
      where: {
        providerId,
        createdAt: { gte: twentyFourHoursAgo },
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

  return { today, appointments, money, waitlist, feedback };
}

export default async function DashboardLayout({
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}): Promise<React.JSX.Element> {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (e) {
    console.error("[dashboard/layout] Auth failed:", e);
    redirect("/");
  }
  if (!userId) redirect("/");

  let provider;
  try {
    provider = await getProvider(userId);
  } catch (e) {
    console.error("[dashboard/layout] getProvider failed:", e);
    redirect("/");
  }
  if (!provider) redirect("/");

  let badges = { today: 0, appointments: 0, money: 0, waitlist: 0, feedback: 0 };
  try {
    badges = await getBadgeCounts(provider.id);
  } catch (e) {
    console.error("[dashboard/layout] getBadgeCounts failed:", e);
  }

  return (
    <div className="min-h-screen flex bg-cream-50 text-ink-900">
      <SidebarNav badges={badges} />
      <div className="flex-1 lg:ml-[220px] min-h-screen pb-16 lg:pb-0">
        <PushRegistration />
        <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
