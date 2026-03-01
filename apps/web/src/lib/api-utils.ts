import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { Prisma } from "@nailbook/db";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function error(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status });
}

/**
 * Wraps an async API route handler with standardized error handling.
 * Catches unhandled exceptions and returns structured JSON error responses.
 *
 * Prisma-specific errors are mapped to appropriate HTTP status codes:
 *   - P2025 (record not found) -> 404
 *   - P2002 (unique constraint violation) -> 409
 *   - All other Prisma errors -> 500
 *
 * Usage: export const GET = withErrorHandler(async (request) => { ... })
 */
export function withErrorHandler<
  T extends (...args: any[]) => Promise<Response | NextResponse>,
>(handler: T): T {
  const wrapped = async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[API Error]", err);

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
          case "P2025":
            return NextResponse.json(
              { error: { message: "Record not found" } },
              { status: 404 }
            );
          case "P2002":
            return NextResponse.json(
              { error: { message: "A record with this value already exists" } },
              { status: 409 }
            );
          default:
            return NextResponse.json(
              { error: { message: "Internal server error" } },
              { status: 500 }
            );
        }
      }

      return NextResponse.json(
        { error: { message: "Internal server error" } },
        { status: 500 }
      );
    }
  };

  return wrapped as T;
}

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        error: NextResponse.json(
          {
            error: {
              message: "Validation error",
              details: e.errors.map((err) => ({
                path: err.path.join("."),
                message: err.message,
              })),
            },
          },
          { status: 422 }
        ),
      };
    }
    return {
      error: NextResponse.json(
        { error: { message: "Invalid request body" } },
        { status: 400 }
      ),
    };
  }
}
