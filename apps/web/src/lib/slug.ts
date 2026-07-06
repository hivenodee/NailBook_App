/**
 * Slug normalization + validation helpers shared by the Phase 2 availability
 * endpoint and the onboarding wizard's debounced input.
 *
 * Slugs become public URLs at /[slug], so they must be safe, lowercase,
 * URL-friendly, and not collide with reserved routes.
 */

/**
 * Normalize raw user input to a candidate slug.
 * Lowercase → trim → replace whitespace with hyphens → strip anything outside
 * [a-z0-9-] → collapse consecutive hyphens → strip leading/trailing hyphens.
 *
 * Returns the empty string for input that has no valid characters.
 */
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reserved slugs that would collide with existing routes or impersonate the
 * platform. Anything new on the filesystem under `app/(public)/[slug]/`
 * or top-level `app/` should be added here.
 */
export const RESERVED_SLUGS = new Set<string>([
  // Public booking flow subpaths under /[slug]/...
  "book",
  "reviews",
  "manage",
  "pay",
  "feedback",
  "tip",
  "confirmation",
  // Top-level app routes
  "dashboard",
  "api",
  "explore",
  "admin",
  "settings",
  "webhooks",
  "design",
  "privacy",
  "terms",
  // Dashboard segments (defensive — these aren't aliased to /[slug], but a
  // slug like "appointments" could read weirdly in marketing copy)
  "appointments",
  "availability",
  "calendar",
  "clients",
  "coupons",
  "exports",
  "history",
  "messages",
  "money",
  "notifications",
  "portfolio",
  "profile",
  "reminders",
  "services",
  "waitlist",
  "onboarding",
  "payouts",
  // Platform / impersonation
  "porobook",
  "support",
  "help",
  "status",
  "root",
  "www",
  "mail",
  "ftp",
  "blog",
  "about",
  "contact",
  "press",
  "team",
  "careers",
  "jobs",
  "login",
  "signin",
  "signup",
  "logout",
  "signout",
  "auth",
  "user",
  "users",
  "account",
  "accounts",
  "billing",
  "pricing",
]);

/** Minimum and maximum slug length. */
export const MIN_SLUG_LEN = 3;
export const MAX_SLUG_LEN = 32;

export type SlugInvalidReason =
  | "too-short"
  | "too-long"
  | "reserved"
  | "invalid-chars";

/**
 * Validate a slug *after* normalization. Returns null when valid, or a
 * machine-readable reason otherwise.
 *
 * Pass already-normalized input or use `normalizeSlug()` first.
 */
export function validateSlug(slug: string): SlugInvalidReason | null {
  if (slug.length < MIN_SLUG_LEN) return "too-short";
  if (slug.length > MAX_SLUG_LEN) return "too-long";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  // Defensive — normalizeSlug() should have stripped these, but double-check.
  if (!/^[a-z0-9-]+$/.test(slug)) return "invalid-chars";
  return null;
}

/**
 * Build up to 3 candidate slugs derived from the user's desired one.
 * Used when the desired slug is taken or reserved — give them ready-to-pick
 * alternatives rather than a dead-end error.
 *
 * Pass the provider's category if known for a category-aware suggestion
 * (e.g. "asha" → "asha-nails" for a NAILS provider).
 */
export function suggestSlugVariants(
  desired: string,
  opts?: { category?: string | null },
): string[] {
  const base = normalizeSlug(desired);
  if (base.length < MIN_SLUG_LEN) return [];

  const categoryToken = (() => {
    switch ((opts?.category || "").toUpperCase()) {
      case "NAILS":
        return "nails";
      case "HAIR":
        return "hair";
      case "BROWS_LASHES":
        return "lashes";
      case "ESTHETICS":
        return "skin";
      case "MASSAGE":
        return "spa";
      default:
        return null;
    }
  })();

  const candidates = new Set<string>();
  // Skip the category suffix when the base already ends with it
  // ("injusstice-nails" + NAILS shouldn't suggest "injusstice-nails-nails").
  if (
    categoryToken &&
    !base.endsWith(`-${categoryToken}`) &&
    base !== categoryToken
  ) {
    candidates.add(`${base}-${categoryToken}`);
  }
  if (!base.endsWith("-studio")) candidates.add(`${base}-studio`);
  if (!base.startsWith("book-")) candidates.add(`book-${base}`);
  if (!base.endsWith("-co")) candidates.add(`${base}-co`);
  // Numeric suffix as final fallback — keeps it tasteful (no random 5-digit IDs).
  candidates.add(`${base}-1`);

  // Filter out anything that fails validation (too long after suffix, etc.)
  return [...candidates]
    .filter((s) => validateSlug(s) === null)
    .slice(0, 3);
}
