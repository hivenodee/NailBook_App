import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
  BETA_COOKIE,
  BETA_HINT_COOKIE,
  BETA_OK_COOKIE,
  betaCookieOptions,
  signBetaCookie,
  verifyBetaCookie,
} from "@/lib/beta";

export const dynamic = "force-dynamic";

function safeNext(request: NextRequest): URL {
  const next = request.nextUrl.searchParams.get("next") || "/dashboard";
  // Only allow same-origin relative paths.
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return new URL(path, request.url);
}

/**
 * Called by the middleware (invite-only mode) for signed-in users whose beta
 * status is not yet confirmed. Records the redemption when a valid invite
 * cookie is present, or restores the cookie from an earlier redemption.
 * Otherwise sends the user back to the landing page.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  const home = new URL("/", request.url);

  if (!userId) {
    home.searchParams.set("invite", "required");
    return NextResponse.redirect(home);
  }

  const existing = await prisma.betaRedemption.findUnique({
    where: { clerkUserId: userId },
    include: { invite: true },
  });

  let code: string | null = existing?.invite.code ?? null;

  if (!existing) {
    const cookieCode = await verifyBetaCookie(request.cookies.get(BETA_COOKIE)?.value);
    if (cookieCode) {
      const invite = await prisma.betaInvite.findUnique({
        where: { code: cookieCode },
        include: { _count: { select: { redemptions: true } } },
      });
      const now = new Date();
      const usable =
        invite &&
        invite.revokedAt === null &&
        (invite.expiresAt === null || invite.expiresAt >= now) &&
        invite._count.redemptions < invite.maxUses;
      if (usable) {
        await prisma.betaRedemption.create({ data: { inviteId: invite.id, clerkUserId: userId } });
        code = invite.code;
      }
    }
  }

  if (!code) {
    home.searchParams.set("invite", "required");
    const res = NextResponse.redirect(home);
    res.cookies.delete(BETA_COOKIE);
    res.cookies.delete(BETA_HINT_COOKIE);
    res.cookies.delete(BETA_OK_COOKIE);
    return res;
  }

  const res = NextResponse.redirect(safeNext(request));
  res.cookies.set(BETA_COOKIE, await signBetaCookie(code), betaCookieOptions);
  res.cookies.set(BETA_HINT_COOKIE, "1", { ...betaCookieOptions, httpOnly: false });
  res.cookies.set(BETA_OK_COOKIE, "1", betaCookieOptions);
  return res;
}
