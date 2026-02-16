import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const VALID_RANGES = ["7d", "30d", "90d", "ytd", "all"] as const;
const VALID_GRANULARITIES = ["daily", "weekly", "monthly", "yearly"] as const;

type Range = (typeof VALID_RANGES)[number];
type Granularity = (typeof VALID_GRANULARITIES)[number];

function getRangeStart(range: Range, timezone: string): Date {
  const now = new Date();
  // Get "today" in provider timezone
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const [y, m, d] = todayStr.split("-").map(Number);

  switch (range) {
    case "7d": {
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() - 6);
      return dt;
    }
    case "30d": {
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() - 29);
      return dt;
    }
    case "90d": {
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() - 89);
      return dt;
    }
    case "ytd":
      return new Date(Date.UTC(y, 0, 1));
    case "all":
      return new Date(Date.UTC(2020, 0, 1)); // far enough back
  }
}

function getRangeEnd(timezone: string): Date {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const [y, m, d] = todayStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

function getBucketKey(date: Date, granularity: Granularity, timezone: string): string {
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: timezone });
  const [y, m, d] = dateStr.split("-").map(Number);

  switch (granularity) {
    case "daily":
      return dateStr;
    case "weekly": {
      // Find the Monday of the ISO week
      const dt = new Date(Date.UTC(y, m - 1, d));
      const day = dt.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday = 1
      dt.setUTCDate(dt.getUTCDate() + diff);
      return dt.toISOString().split("T")[0];
    }
    case "monthly":
      return `${y}-${String(m).padStart(2, "0")}`;
    case "yearly":
      return String(y);
  }
}

function getBucketLabel(key: string, granularity: Granularity): string {
  switch (granularity) {
    case "daily": {
      const [, m, d] = key.split("-").map(Number);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[m - 1]} ${d}`;
    }
    case "weekly": {
      // key is the Monday date
      const dt = new Date(key + "T00:00:00Z");
      const startOfYear = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
      const dayOfYear = Math.floor((dt.getTime() - startOfYear.getTime()) / 86400000);
      const weekNum = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
      return `W${weekNum}`;
    }
    case "monthly": {
      const [y, m] = key.split("-").map(Number);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[m - 1]} '${String(y).slice(2)}`;
    }
    case "yearly":
      return key;
  }
}

function generateAllBucketKeys(rangeStart: Date, rangeEnd: Date, granularity: Granularity, timezone: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(rangeStart);

  while (cursor <= rangeEnd) {
    const key = getBucketKey(cursor, granularity, timezone);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") || "30d") as Range;
  const granularity = (searchParams.get("granularity") || "daily") as Granularity;

  if (!VALID_RANGES.includes(range)) return error("Invalid range", 400);
  if (!VALID_GRANULARITIES.includes(granularity)) return error("Invalid granularity", 400);

  const timezone = user.provider.timezone || "America/New_York";
  const rangeStart = getRangeStart(range, timezone);
  const today = getRangeEnd(timezone);

  // Fetch appointments from rangeStart onward (no upper bound — includes upcoming confirmed bookings)
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: user.provider.id,
      status: { in: ["COMPLETED", "CONFIRMED", "CANCELLED", "NO_SHOW"] },
      startTime: { gte: rangeStart },
    },
    select: {
      startTime: true,
      totalInCents: true,
      status: true,
      bookedFromWaitlist: true,
    },
  });

  // Determine rangeEnd: extend to cover furthest appointment or today, whichever is later
  const latestApptTime = appointments.length > 0
    ? new Date(Math.max(...appointments.map((a) => a.startTime.getTime())))
    : today;
  const rangeEnd = latestApptTime > today ? latestApptTime : today;

  // Generate all bucket keys (for continuous chart with zero-fills)
  const allKeys = generateAllBucketKeys(rangeStart, rangeEnd, granularity, timezone);

  // Initialize buckets
  const bucketMap = new Map<string, {
    revenue: number;
    lostRevenue: number;
    recoveredRevenue: number;
    netRevenue: number;
  }>();
  for (const key of allKeys) {
    bucketMap.set(key, { revenue: 0, lostRevenue: 0, recoveredRevenue: 0, netRevenue: 0 });
  }

  // Summary accumulators
  const summary = {
    revenue: 0,
    lostRevenue: 0,
    recoveredRevenue: 0,
    netRevenue: 0,
    appointmentCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
    waitlistRecoveryCount: 0,
  };

  // Bucket each appointment
  for (const appt of appointments) {
    const key = getBucketKey(appt.startTime, granularity, timezone);
    const bucket = bucketMap.get(key);
    if (!bucket) continue; // outside range edge case

    if (appt.status === "COMPLETED" || appt.status === "CONFIRMED") {
      bucket.revenue += appt.totalInCents;
      summary.revenue += appt.totalInCents;
      summary.appointmentCount++;
      if (appt.status === "CONFIRMED") summary.confirmedCount++;

      if (appt.bookedFromWaitlist) {
        bucket.recoveredRevenue += appt.totalInCents;
        summary.recoveredRevenue += appt.totalInCents;
        summary.waitlistRecoveryCount++;
      }
    } else {
      // CANCELLED or NO_SHOW
      bucket.lostRevenue += appt.totalInCents;
      summary.lostRevenue += appt.totalInCents;
      if (appt.status === "CANCELLED") summary.cancelledCount++;
      else summary.noShowCount++;
    }
  }

  // Compute net for each bucket
  for (const bucket of bucketMap.values()) {
    bucket.netRevenue = bucket.revenue - bucket.lostRevenue;
  }
  summary.netRevenue = summary.revenue - summary.lostRevenue;

  // Build ordered buckets array
  const buckets = allKeys.map((key) => ({
    date: key,
    label: getBucketLabel(key, granularity),
    ...bucketMap.get(key)!,
  }));

  return success({
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    summary,
    buckets,
  });
}
