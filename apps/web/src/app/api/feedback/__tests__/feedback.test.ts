import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, parseResponse } from "@/test/helpers";
import { POST, GET } from "../route";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const mockAuth = vi.mocked(auth);
const mockAppointmentFindUnique = vi.mocked(prisma.appointment.findUnique);
const mockFeedbackFindUnique = vi.mocked(prisma.feedback.findUnique);
const mockFeedbackCreate = vi.mocked(prisma.feedback.create);
const mockFeedbackFindMany = vi.mocked(prisma.feedback.findMany);
const mockFeedbackCount = vi.mocked(prisma.feedback.count);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

// Valid CUID-format IDs for tests (Zod .cuid() requires /^c[^\s-]{8,}$/i)
const APPT_ID_1 = "cm00000001testappt00001";
const APPT_ID_2 = "cm00000002testappt00002";
const APPT_ID_3 = "cm00000003testappt00003";
const APPT_ID_4 = "cm00000004testappt00004";
const APPT_ID_5 = "cm00000005testappt00005";

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates feedback with valid data", async () => {
    mockAppointmentFindUnique.mockResolvedValue({
      id: APPT_ID_1,
      status: "COMPLETED",
      providerId: "provider_1",
    } as any);

    mockFeedbackFindUnique.mockResolvedValue(null);

    const createdFeedback = {
      id: "feedback_1",
      appointmentId: APPT_ID_1,
      providerId: "provider_1",
      rating: 5,
      body: "Amazing nails! Love the design.",
      isPublic: false,
      createdAt: new Date(),
    };
    mockFeedbackCreate.mockResolvedValue(createdFeedback as any);

    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_1,
        rating: 5,
        body: "Amazing nails! Love the design.",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(201);
    expect(body.data.id).toBe("feedback_1");
    expect(body.data.rating).toBe(5);
    expect(body.data.body).toBe("Amazing nails! Love the design.");
  });

  it("creates feedback without rating (rating is optional)", async () => {
    mockAppointmentFindUnique.mockResolvedValue({
      id: APPT_ID_2,
      status: "COMPLETED",
      providerId: "provider_1",
    } as any);

    mockFeedbackFindUnique.mockResolvedValue(null);

    mockFeedbackCreate.mockResolvedValue({
      id: "feedback_2",
      appointmentId: APPT_ID_2,
      providerId: "provider_1",
      rating: null,
      body: "Great service, will come back!",
      isPublic: false,
    } as any);

    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_2,
        body: "Great service, will come back!",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(201);
    expect(body.data.rating).toBeNull();
  });

  it("rejects invalid rating (out of range, above max)", async () => {
    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_1,
        rating: 6,
        body: "Some feedback text",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(422);
    expect(body.error.message).toBe("Validation error");
  });

  it("rejects rating of 0 (minimum is 1)", async () => {
    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_1,
        rating: 0,
        body: "Some feedback text",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(422);
    expect(body.error.message).toBe("Validation error");
  });

  it("rejects empty body text", async () => {
    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_1,
        body: "",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(422);
    expect(body.error.message).toBe("Validation error");
  });

  it("rejects feedback for non-completed appointment", async () => {
    mockAppointmentFindUnique.mockResolvedValue({
      id: APPT_ID_3,
      status: "CONFIRMED",
      providerId: "provider_1",
    } as any);

    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_3,
        rating: 4,
        body: "Too early for feedback",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error.message).toBe("Feedback can only be left for completed appointments");
  });

  it("rejects duplicate feedback for same appointment", async () => {
    mockAppointmentFindUnique.mockResolvedValue({
      id: APPT_ID_4,
      status: "COMPLETED",
      providerId: "provider_1",
    } as any);

    mockFeedbackFindUnique.mockResolvedValue({
      id: "existing_feedback",
      appointmentId: APPT_ID_4,
    } as any);

    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_4,
        rating: 3,
        body: "Trying to submit again",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(409);
    expect(body.error.message).toBe("Feedback already submitted for this appointment");
  });

  it("returns 404 when appointment not found", async () => {
    mockAppointmentFindUnique.mockResolvedValue(null);

    const request = createMockRequest("POST", "/api/feedback", {
      body: {
        appointmentId: APPT_ID_5,
        rating: 5,
        body: "Great service!",
      },
    });

    const response = await POST(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(404);
    expect(body.error.message).toBe("Appointment not found");
  });
});

describe("GET /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue({ userId: null } as any);

    const request = createMockRequest("GET", "/api/feedback");
    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(401);
    expect(body.error.message).toBe("Unauthorized");
  });

  it("returns 403 if user is not a provider", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_client_user" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "user_client",
      clerkId: "clerk_client_user",
      provider: null,
    } as any);

    const request = createMockRequest("GET", "/api/feedback");
    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(403);
    expect(body.error.message).toBe("Provider not found");
  });

  it("returns paginated feedback list for authenticated provider", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_provider" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "user_provider",
      clerkId: "clerk_provider",
      provider: { id: "provider_1" },
    } as any);

    const feedbackItems = [
      {
        id: "fb_1",
        rating: 5,
        body: "Loved it!",
        isPublic: true,
        createdAt: new Date(),
        appointment: { startTime: new Date(), service: { name: "Gel Full Set" } },
      },
      {
        id: "fb_2",
        rating: 4,
        body: "Good work",
        isPublic: false,
        createdAt: new Date(),
        appointment: { startTime: new Date(), service: { name: "Classic Manicure" } },
      },
    ];
    mockFeedbackFindMany.mockResolvedValue(feedbackItems as any);
    mockFeedbackCount.mockResolvedValue(2);

    const request = createMockRequest("GET", "/api/feedback");
    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.page).toBe(1);
    expect(body.data.limit).toBe(20);
  });

  it("applies public filter when query param is set", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_provider" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "user_provider",
      clerkId: "clerk_provider",
      provider: { id: "provider_1" },
    } as any);

    mockFeedbackFindMany.mockResolvedValue([]);
    mockFeedbackCount.mockResolvedValue(0);

    const request = createMockRequest("GET", "/api/feedback", {
      searchParams: { public: "true" },
    });
    const response = await GET(request);
    await parseResponse(response);

    expect(mockFeedbackFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: "provider_1", isPublic: true },
      })
    );
  });

  it("respects pagination parameters", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_provider" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "user_provider",
      clerkId: "clerk_provider",
      provider: { id: "provider_1" },
    } as any);

    mockFeedbackFindMany.mockResolvedValue([]);
    mockFeedbackCount.mockResolvedValue(50);

    const request = createMockRequest("GET", "/api/feedback", {
      searchParams: { page: "3", limit: "10" },
    });
    const response = await GET(request);
    const { body } = await parseResponse(response);

    expect(mockFeedbackFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
    expect(body.data.page).toBe(3);
    expect(body.data.limit).toBe(10);
  });
});
