import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function error(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status });
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
