// Centralized availability cache helpers.
// All functions no-op when Redis is not configured.

const CACHE_PREFIX = "avail";
const DEFAULT_TTL = 300; // 5 minutes

function cacheKey(providerId: string, dateStr: string): string {
  return `${CACHE_PREFIX}:${providerId}:${dateStr}`;
}

async function getRedis() {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) return null;
  try {
    const { redis } = await import("@/lib/redis");
    return redis;
  } catch {
    return null;
  }
}

export async function getAvailabilityCache(providerId: string, dateStr: string): Promise<unknown | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    return await redis.get(cacheKey(providerId, dateStr));
  } catch {
    return null;
  }
}

export async function setAvailabilityCache(
  providerId: string,
  dateStr: string,
  data: unknown,
  ttl: number = DEFAULT_TTL,
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(cacheKey(providerId, dateStr), data, { ex: ttl });
  } catch {
    // Cache write failure is non-critical
  }
}

export async function invalidateAvailability(providerId: string, ...dateStrs: string[]): Promise<void> {
  if (dateStrs.length === 0) return;
  const redis = await getRedis();
  if (!redis) return;
  try {
    const keys = dateStrs.map((d) => cacheKey(providerId, d));
    await redis.del(...keys);
  } catch {
    // Invalidation failure is non-critical
  }
}

export async function invalidateAllAvailability(providerId: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    const pattern = `${CACHE_PREFIX}:${providerId}:*`;
    let cursor = "0";
    do {
      const [nextCursor, keys]: [string, string[]] = await redis.scan(
        Number(cursor),
        { match: pattern, count: 100 },
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Invalidation failure is non-critical
  }
}

export async function invalidateAvailabilityRange(
  providerId: string,
  startDate: Date | string,
  endDate: Date | string,
): Promise<void> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (dates.length > 0) {
    await invalidateAvailability(providerId, ...dates);
  }
}
