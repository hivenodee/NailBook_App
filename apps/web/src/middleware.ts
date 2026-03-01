import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/explore",
  "/:slug((?!api|_next|favicon|dashboard|explore).*)",
  "/:slug/book",
  "/:slug/confirmation",
  "/:slug/feedback/(.*)",
  "/:slug/pay/(.*)",
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

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
