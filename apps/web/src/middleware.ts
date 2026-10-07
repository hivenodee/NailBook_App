import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  isAllowedInLandingMode,
  isInviteOnly,
  isLandingOnly,
  isOpenInInviteMode,
} from "@/lib/launch-mode";
import { BETA_COOKIE, BETA_OK_COOKIE, verifyBetaCookie } from "@/lib/beta";

const isPublicRoute = createRouteMatcher([
  "/",
  "/explore",
  "/:slug((?!api|_next|favicon|dashboard|explore|onboarding).*)",
  "/:slug/book",
  "/:slug/confirmation",
  "/:slug/feedback/(.*)",
  "/:slug/pay/(.*)",
  "/:slug/tip/(.*)",
  "/:slug/manage/(.*)",
  "/:slug/reviews",
  "/api/providers(.*)",
  "/api/services(.*)",
  "/api/appointments",
  "/api/appointments/(.*)",
  "/api/availability/(.*)",
  "/api/feedback",
  "/api/webhooks/(.*)",
  "/api/push-tokens",
  "/api/reminders/(.*)",
  "/api/notifications",
  "/api/health",
  "/privacy",
  "/terms",
]);

// Routes that require auth but should remain reachable for providers who
// haven't completed the wizard yet — the wizard itself plus every API
// endpoint it submits to.
const isOnboardingRoute = createRouteMatcher([
  "/onboarding",
  "/onboarding/(.*)",
  "/api/providers",
  "/api/providers/(.*)",
  "/api/services",
  "/api/services/(.*)",
  "/api/availability/(.*)",
  "/api/uploads/(.*)",
]);

const isDashboardRoute = createRouteMatcher(["/dashboard", "/dashboard/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  // Landing-only launch mode: everything except the marketing page, legal
  // pages and health check bounces back to `/`. See lib/launch-mode.ts.
  if (isLandingOnly && !isAllowedInLandingMode(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Invite-only beta: everything past the landing page needs a beta invite.
  // Visitors with a valid invite cookie pass; signed-in users get bounced once
  // through /api/beta/check, which records (or restores) their redemption and
  // sets the confirmation cookie so later requests skip this block.
  if (isInviteOnly && !isOpenInInviteMode(request.nextUrl.pathname)) {
    const inviteCode = await verifyBetaCookie(request.cookies.get(BETA_COOKIE)?.value);
    const confirmed = !!inviteCode && request.cookies.get(BETA_OK_COOKIE)?.value === "1";
    if (!confirmed) {
      const { userId: betaUserId } = await auth();
      if (betaUserId) {
        const url = request.nextUrl.clone();
        url.pathname = "/api/beta/check";
        url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
        return NextResponse.redirect(url);
      }
      if (!inviteCode) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "?invite=required";
        return NextResponse.redirect(url);
      }
      // Invited but not signed in yet: continue to the normal public/protected flow.
    }
  }

  if (isPublicRoute(request)) return;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    await auth.protect();
    return;
  }

  // The onboarded flag is denormalized to Clerk publicMetadata when the
  // wizard finishes, so middleware can gate at the Edge without a DB read.
  //
  // Requires the Clerk dashboard's session token template to include
  // `publicMetadata` (Clerk Dashboard → Sessions → Customize session token):
  //   {
  //     "publicMetadata": "{{user.public_metadata}}"
  //   }
  //
  // If that template isn't configured `sessionClaims.publicMetadata` will be
  // undefined here. We treat that as "unknown" and fall through rather than
  // redirect — the wizard page and the dashboard layout each have their own
  // belt-and-suspenders checks (useUser + getProvider), so the system still
  // works, just without the Edge optimization.
  const publicMetadata = (sessionClaims as { publicMetadata?: { onboarded?: boolean } } | null)
    ?.publicMetadata;
  if (!publicMetadata) return;

  const onboarded = publicMetadata.onboarded === true;

  if (!onboarded && isDashboardRoute(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (onboarded && request.nextUrl.pathname === "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
