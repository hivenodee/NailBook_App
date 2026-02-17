import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

let _ratelimit: Ratelimit | null = null;
let _strictRatelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) return null;
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      }),
      // 60 requests per 60 seconds per IP
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "rl:api",
    });
  }
  return _ratelimit;
}

function getStrictRatelimit(): Ratelimit | null {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) return null;
  if (!_strictRatelimit) {
    _strictRatelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      }),
      // 10 requests per 60 seconds per IP (for write endpoints)
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl:strict",
    });
  }
  return _strictRatelimit;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Apply standard rate limiting (60 req/min per IP).
 * Returns a 429 response if exceeded, or null if allowed.
 * No-op if Redis is not configured.
 */
export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const limiter = getRatelimit();
  if (!limiter) return null;

  const ip = getClientIp(request);
  const { success } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: { message: "Too many requests. Please try again later.", code: "RATE_LIMITED" } },
      { status: 429 }
    );
  }
  return null;
}

/**
 * Apply strict rate limiting (10 req/min per IP).
 * For write endpoints like booking, feedback, balance checkout.
 * Returns a 429 response if exceeded, or null if allowed.
 * No-op if Redis is not configured.
 */
export async function strictRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const limiter = getStrictRatelimit();
  if (!limiter) return null;

  const ip = getClientIp(request);
  const { success } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: { message: "Too many requests. Please try again later.", code: "RATE_LIMITED" } },
      { status: 429 }
    );
  }
  return null;
}
