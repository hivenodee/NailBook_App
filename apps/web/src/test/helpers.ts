import { NextRequest } from "next/server";

/**
 * Creates a mock NextRequest suitable for testing API route handlers.
 */
export function createMockRequest(
  method: string,
  url: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  }
): NextRequest {
  const fullUrl = new URL(url, "http://localhost:3000");
  if (options?.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value);
    });
  }

  const init: Record<string, unknown> = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  };

  if (options?.body && method !== "GET") {
    init.body = JSON.stringify(options.body);
  }

  return new NextRequest(fullUrl, init as any);
}

/**
 * Parses a Response into { status, body } for easy assertions.
 */
export async function parseResponse(response: Response) {
  const json = await response.json();
  return { status: response.status, body: json };
}
