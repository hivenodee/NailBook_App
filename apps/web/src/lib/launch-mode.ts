/**
 * Launch mode gate.
 *
 * `NEXT_PUBLIC_LAUNCH_MODE=landing` puts the deployed app into "landing only"
 * mode: the marketing home page, privacy and terms are reachable, everything
 * else (explore, provider pages, booking, dashboard, onboarding, all API
 * routes except health) redirects back to `/`. Used while the production
 * domain is live but the product is not yet open to providers or clients.
 *
 * Unset (or any other value) means the full app is served.
 */
export const LAUNCH_MODE: string = process.env.NEXT_PUBLIC_LAUNCH_MODE ?? "full";

export const isLandingOnly: boolean = LAUNCH_MODE === "landing";

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
