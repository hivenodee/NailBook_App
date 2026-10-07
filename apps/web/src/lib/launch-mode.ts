/**
 * Launch mode gate.
 *
 * `NEXT_PUBLIC_LAUNCH_MODE=landing` puts the deployed app into "landing only"
 * mode: the marketing home page, privacy and terms are reachable, everything
 * else (explore, provider pages, booking, dashboard, onboarding, all API
 * routes except health) redirects back to `/`. Used while the production
 * domain is live but the product is not yet open to providers or clients.
 *
 * `NEXT_PUBLIC_LAUNCH_MODE=invite` is the beta gate: the landing page is
 * public, everything else needs a beta invite. Visiting /invite/<code> sets a
 * signed cookie (see lib/beta.ts); signed-in users without the cookie are
 * checked against their recorded redemption by /api/beta/check.
 *
 * Unset (or any other value) means the full app is served.
 */
export const LAUNCH_MODE: string = process.env.NEXT_PUBLIC_LAUNCH_MODE ?? "full";

export const isLandingOnly: boolean = LAUNCH_MODE === "landing";

export const isInviteOnly: boolean = LAUNCH_MODE === "invite";

/** Paths still served when in landing-only mode. Exact matches only. */
export const LANDING_ALLOWED_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/privacy",
  "/terms",
  "/api/health",
  "/robots.txt",
  "/sitemap.xml",
  "/icon",
  "/apple-icon",
]);

export function isAllowedInLandingMode(pathname: string): boolean {
  return LANDING_ALLOWED_PATHS.has(pathname);
}

/** Paths served to everyone in invite-only mode, on top of the landing set. */
const INVITE_OPEN_PREFIXES = ["/invite/", "/api/beta/", "/api/webhooks/"];

export function isOpenInInviteMode(pathname: string): boolean {
  if (LANDING_ALLOWED_PATHS.has(pathname)) return true;
  return INVITE_OPEN_PREFIXES.some((p) => pathname.startsWith(p));
}
