import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
  BETA_COOKIE,
  BETA_HINT_COOKIE,
  BETA_OK_COOKIE,
  betaCookieOptions,
  signBetaCookie,
} from "@/lib/beta";

export const dynamic = "force-dynamic";

/**
 * Beta invite link: /invite/<code>
 *
 * Validates the invite, sets the signed beta cookie, and sends the visitor to
 * the landing page with a banner that offers sign up / sign in. If they are
 * already signed in, the redemption is recorded right away and they land in
 * the app.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code } = await params;
  const home = new URL("/", request.url);

  const invite = await prisma.betaInvite.findUnique({
    where: { code },
    include: { _count: { select: { redemptions: true } } },
  });

  const now = new Date();
  const invalid =
    !invite ||
    invite.revokedAt !== null ||
    (invite.expiresAt !== null && invite.expiresAt < now) ||
    invite._count.redemptions >= invite.maxUses;

  if (invalid) {
    home.searchParams.set("invite", "invalid");
    return NextResponse.redirect(home);
  }

  const { userId } = await auth();
  let destination = home;
  let recorded = false;

  if (userId) {
    const existing = await prisma.betaRedemption.findUnique({ where: { clerkUserId: userId } });
    if (!existing) {
      await prisma.betaRedemption.create({ data: { inviteId: invite.id, clerkUserId: userId } });
    }
    recorded = true;
    destination = new URL("/dashboard", request.url);
  } else {
    home.searchParams.set("invite", "accepted");
  }

  const res = NextResponse.redirect(destination);
  res.cookies.set(BETA_COOKIE, await signBetaCookie(invite.code), betaCookieOptions);
  res.cookies.set(BETA_HINT_COOKIE, "1", { ...betaCookieOptions, httpOnly: false });
  if (recorded) res.cookies.set(BETA_OK_COOKIE, "1", betaCookieOptions);
  return res;
}
