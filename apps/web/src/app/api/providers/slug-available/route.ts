import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, withErrorHandler } from "@/lib/api-utils";
import { strictRateLimit } from "@/lib/rate-limit";
import {
  normalizeSlug,
  validateSlug,
  suggestSlugVariants,
  RESERVED_SLUGS,
  MIN_SLUG_LEN,
} from "@/lib/slug";

export const dynamic = "force-dynamic";

// GET /api/providers/slug-available?slug=…&category=NAILS (optional)
//
// Public endpoint with strict rate limiting — slug-checking is a typing-rate
// activity in the wizard so we don't want it abused as a username scanner.
//
// Response envelope:
//   { data: { available: boolean, normalized: string, reason?: string,
//             suggestions?: string[] } }
//
// `available` is true only when normalize → validate → uniqueness all pass.
export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const limited = await strictRateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("slug") || "";
  const category = searchParams.get("category");

  // Always return the normalized form so the client can render exactly what
  // we'd store. This lets the wizard show "your link will be: porobook.com/asha-nails"
  // as the user types.
  const normalized = normalizeSlug(raw);

  if (normalized.length < MIN_SLUG_LEN) {
    return success({
      available: false,
      normalized,
      reason: "too-short",
    });
  }

  const validationError = validateSlug(normalized);
  if (validationError) {
    return success({
      available: false,
      normalized,
      reason: validationError,
      suggestions:
        validationError === "reserved"
          ? suggestSlugVariants(normalized, { category })
          : undefined,
    });
  }

  // Uniqueness check.
  const existing = await prisma.provider.findUnique({
    where: { slug: normalized },
    select: { id: true },
  });

  if (existing) {
    return success({
      available: false,
      normalized,
      reason: "taken",
      suggestions: suggestSlugVariants(normalized, { category }),
    });
  }

  return success({
    available: true,
    normalized,
  });
});
