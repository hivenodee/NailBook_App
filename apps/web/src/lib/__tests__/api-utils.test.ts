import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  success,
  error,
  withErrorHandler,
  parseBody,
} from "../api-utils";
import { Prisma } from "@nailbook/db";
import { z } from "zod";

describe("success()", () => {
  it("returns JSON response with data envelope and 200 status", async () => {
    const response = success({ id: "1", name: "test" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "1", name: "test" });
  });

  it("accepts custom status code", async () => {
    const response = success({ created: true }, 201);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.created).toBe(true);
  });
});

describe("error()", () => {
  it("returns JSON response with error envelope", async () => {
    const response = error("Something went wrong", 400);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toBe("Something went wrong");
  });

  it("includes optional error code", async () => {
    const response = error("Rate limited", 429, "RATE_LIMITED");
    const body = await response.json();

    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("defaults to 400 status", async () => {
    const response = error("Bad request");
    expect(response.status).toBe(400);
  });
});

describe("withErrorHandler()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error output during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("passes through successful responses", async () => {
    const handler = withErrorHandler(async (_req: NextRequest) => {
      return NextResponse.json({ data: "ok" }, { status: 200 });
    });

    const response = await handler(new NextRequest("http://localhost:3000/api/test"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBe("ok");
  });

  it("catches unhandled errors and returns 500", async () => {
    const handler = withErrorHandler(async (_req: NextRequest): Promise<Response> => {
      throw new Error("Unexpected failure");
    });

    const response = await handler(new NextRequest("http://localhost:3000/api/test"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).toBe("Internal server error");
  });

  it("maps Prisma P2025 (record not found) to 404", async () => {
    const handler = withErrorHandler(async (_req: NextRequest): Promise<Response> => {
      throw new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025" } as any
      );
    });

    const response = await handler(new NextRequest("http://localhost:3000/api/test"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe("Record not found");
  });

  it("maps Prisma P2002 (unique constraint) to 409", async () => {
    const handler = withErrorHandler(async (_req: NextRequest): Promise<Response> => {
      throw new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002" } as any
      );
    });

    const response = await handler(new NextRequest("http://localhost:3000/api/test"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.message).toBe("A record with this value already exists");
  });

  it("maps unknown Prisma errors to 500", async () => {
    const handler = withErrorHandler(async (_req: NextRequest): Promise<Response> => {
      throw new Prisma.PrismaClientKnownRequestError(
        "Some other Prisma error",
        { code: "P2003" } as any
      );
    });

    const response = await handler(new NextRequest("http://localhost:3000/api/test"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).toBe("Internal server error");
  });

  it("preserves the handler's argument signature", async () => {
    const handler = withErrorHandler(async (req: NextRequest) => {
      const url = req.url;
      return NextResponse.json({ data: url });
    });

    const response = await handler(new NextRequest("http://localhost:3000/api/hello"));
    const body = await response.json();

    expect(body.data).toBe("http://localhost:3000/api/hello");
  });
});

describe("parseBody()", () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().min(0),
  });

  it("parses valid body and returns data", async () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", age: 30 }),
    });

    const result = await parseBody(request, testSchema);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });

  it("returns 422 with validation details for invalid data", async () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", age: -1 }),
    });

    const result = await parseBody(request, testSchema);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(NextResponse);
    const body = await result.error!.json();

    expect(result.error!.status).toBe(422);
    expect(body.error.message).toBe("Validation error");
    expect(body.error.details).toBeInstanceOf(Array);
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it("returns 400 for unparseable JSON body", async () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });

    const result = await parseBody(request, testSchema);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(NextResponse);
    const body = await result.error!.json();

    expect(result.error!.status).toBe(400);
    expect(body.error.message).toBe("Invalid request body");
  });

  it("includes path info in validation error details", async () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 123, age: "not a number" }),
    });

    const result = await parseBody(request, testSchema);
    const body = await result.error!.json();

    const paths = body.error.details.map((d: any) => d.path);
    expect(paths).toContain("name");
    expect(paths).toContain("age");
  });
});
