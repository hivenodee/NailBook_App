import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
