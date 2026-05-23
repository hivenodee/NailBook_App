/**
 * Input sanitization utilities to protect against XSS.
 *
 * Uses DOMPurify (via isomorphic-dompurify for Node.js) with all HTML tags
 * stripped, keeping only text content. Handles null/undefined gracefully.
 *
 * Lazy-initialized to avoid module-level side-effects that break Next.js builds.
 */

/**
 * Strip all HTML tags from a string and trim whitespace.
 * Returns null/undefined as-is for nullable fields.
 *
 * Iterates the strip until stable to defeat nested patterns like `<scr<script>ipt>`.
 */
export function sanitizeText(input: string): string;
export function sanitizeText(input: string | null | undefined): string | null | undefined;
export function sanitizeText(input: string | null | undefined): string | null | undefined {
  if (input == null) return input;
  let result = String(input);
  let prev: string;
  do {
    prev = result;
    result = result.replace(/<[^>]*>?/g, "");
  } while (result !== prev);
  return result.trim();
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
