/**
 * Input sanitization utilities to protect against XSS.
 *
 * Uses DOMPurify (via isomorphic-dompurify for Node.js) with all HTML tags
 * stripped, keeping only text content. Handles null/undefined gracefully.
 *
 * Lazy-initialized to avoid module-level side-effects that break Next.js builds.
 */

let _DOMPurify: typeof import("isomorphic-dompurify").default | null = null;

function getDOMPurify() {
  if (!_DOMPurify) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _DOMPurify = require("isomorphic-dompurify") as typeof import("isomorphic-dompurify").default;
  }
  return _DOMPurify;
}

/**
 * Strip all HTML tags from a string and trim whitespace.
 * Returns null/undefined as-is for nullable fields.
 */
export function sanitizeText(input: string): string;
export function sanitizeText(input: string | null | undefined): string | null | undefined;
export function sanitizeText(input: string | null | undefined): string | null | undefined {
  if (input == null) return input;
  const DOMPurify = getDOMPurify();
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
}

/**
 * Sanitize specified string fields within an object (shallow).
 * Non-string fields and fields not in the list are left untouched.
 * Returns a new object with sanitized values.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[field as string] = sanitizeText(value);
    }
  }
  return result;
}
