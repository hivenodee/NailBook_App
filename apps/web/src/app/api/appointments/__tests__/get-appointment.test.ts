import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, parseResponse } from "@/test/helpers";
import { GET } from "../[id]/route";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

const mockAuth = vi.mocked(auth);
const mockAppointmentFindUnique = vi.mocked(prisma.appointment.findUnique);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

const MOCK_APPOINTMENT = {
  id: "appt_1",
  providerId: "provider_1",
  clientId: "client_1",
  serviceId: "service_1",
  status: "CONFIRMED",
  startTime: new Date("2026-03-15T13:00:00Z"),
  endTime: new Date("2026-03-15T14:00:00Z"),
  totalInCents: 5000,
  depositInCents: 1500,
  clientName: "Maya Johnson",
  clientEmail: "maya@example.com",
  manageToken: "valid-token-123",
  service: { id: "service_1", name: "Classic Manicure", durationMinutes: 60, priceInCents: 5000 },
  addOns: [],
  provider: { businessName: "Injusstice Nails", slug: "injusstice-nails", timezone: "America/New_York", cancellationHours: 24 },
  client: { firstName: "Maya", lastName: "Johnson", avatarUrl: null },
  coupon: null,
  events: [],
  payments: [],
  feedback: null,
  intakeResponses: [],
};

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/appointments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when appointment not found", async () => {
    mockAppointmentFindUnique.mockResolvedValue(null);

    const request = createMockRequest("GET", "/api/appointments/nonexistent");
    const response = await GET(request, createParams("nonexistent"));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(404);
    expect(body.error.message).toBe("Appointment not found");
  });

  it("returns appointment data with valid manage token", async () => {
    mockAppointmentFindUnique.mockResolvedValue(MOCK_APPOINTMENT as any);

    const request = createMockRequest("GET", "/api/appointments/appt_1", {
      searchParams: { token: "valid-token-123" },
    });
    const response = await GET(request, createParams("appt_1"));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.data.id).toBe("appt_1");
    expect(body.data.clientName).toBe("Maya Johnson");
    expect(body.data.provider.businessName).toBe("Injusstice Nails");
  });

  it("returns 403 when manage token is invalid", async () => {
    mockAppointmentFindUnique.mockResolvedValue(MOCK_APPOINTMENT as any);

    const request = createMockRequest("GET", "/api/appointments/appt_1", {
      searchParams: { token: "wrong-token" },
    });
    const response = await GET(request, createParams("appt_1"));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(403);
    expect(body.error.message).toBe("Invalid token");
  });

  it("returns 401 when no token and no auth", async () => {
    mockAppointmentFindUnique.mockResolvedValue(MOCK_APPOINTMENT as any);
    mockAuth.mockResolvedValue({ userId: null } as any);

    const request = createMockRequest("GET", "/api/appointments/appt_1");
    const response = await GET(request, createParams("appt_1"));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(401);
    expect(body.error.message).toBe("Unauthorized");
  });

  it("returns 403 when authenticated user is not the provider", async () => {
    mockAppointmentFindUnique.mockResolvedValue(MOCK_APPOINTMENT as any);
    mockAuth.mockResolvedValue({ userId: "clerk_other_user" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "user_other",
      clerkId: "clerk_other_user",
      provider: { id: "provider_different" },
    } as any);

    const request = createMockRequest("GET", "/api/appointments/appt_1");
    const response = await GET(request, createParams("appt_1"));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(403);
    expect(body.error.message).toBe("Forbidden");
  });

  it("returns appointment when authenticated user is the owning provider", async () => {
    mockAppointmentFindUnique.mockResolvedValue(MOCK_APPOINTMENT as any);
    mockAuth.mockResolvedValue({ userId: "clerk_provider_user" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "user_provider",
      clerkId: "clerk_provider_user",
      provider: { id: "provider_1" },
    } as any);

    const request = createMockRequest("GET", "/api/appointments/appt_1");
    const response = await GET(request, createParams("appt_1"));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.data.id).toBe("appt_1");
    expect(body.data.service.name).toBe("Classic Manicure");
  });

  it("returns 404 when authenticated user not found in DB", async () => {
    mockAppointmentFindUnique.mockResolvedValue(MOCK_APPOINTMENT as any);
    mockAuth.mockResolvedValue({ userId: "clerk_unknown" } as any);
    mockUserFindUnique.mockResolvedValue(null);

    const request = createMockRequest("GET", "/api/appointments/appt_1");
    const response = await GET(request, createParams("appt_1"));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(404);
    expect(body.error.message).toBe("User not found");
  });

  it("queries appointment with correct include relations", async () => {
    mockAppointmentFindUnique.mockResolvedValue(null);

    const request = createMockRequest("GET", "/api/appointments/appt_1");
    await GET(request, createParams("appt_1"));

    expect(mockAppointmentFindUnique).toHaveBeenCalledWith({
      where: { id: "appt_1" },
      include: expect.objectContaining({
        service: true,
        addOns: expect.any(Object),
        provider: expect.any(Object),
        client: expect.any(Object),
        events: expect.any(Object),
        payments: expect.any(Object),
        feedback: expect.any(Object),
        intakeResponses: expect.any(Object),
      }),
    });
  });
});
