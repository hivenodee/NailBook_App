import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest, parseResponse } from "@/test/helpers";
import { GET } from "../route";
import { prisma } from "@/lib/db";

const mockProviderFindMany = vi.mocked(prisma.provider.findMany);

function createProviderResult(overrides: Record<string, any> = {}) {
  return {
    id: "provider_1",
    slug: "test-nails",
    businessName: "Test Nails",
    category: "NAILS",
    locationAddress: "123 Main St, New York, NY",
    locationLat: 40.7128,
    locationLng: -74.006,
    isVerified: false,
    booksOpen: true,
    user: { avatarUrl: null },
    mediaAssets: [],
    feedback: [],
    _count: { services: 3 },
    createdAt: new Date(),
    ...overrides,
  };
}

describe("GET /api/providers/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns providers within radius when lat/lng provided", async () => {
    // Provider at ~0.5 miles from search location
    const nearbyProvider = createProviderResult({
      id: "provider_nearby",
      slug: "nearby-nails",
      businessName: "Nearby Nails",
      locationLat: 40.713,
      locationLng: -74.005,
    });

    mockProviderFindMany.mockResolvedValue([nearbyProvider] as any);

    const request = createMockRequest("GET", "/api/providers/search", {
      searchParams: {
        lat: "40.7128",
        lng: "-74.006",
        radiusMiles: "25",
      },
    });

    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.data.providers).toHaveLength(1);
    expect(body.data.providers[0].slug).toBe("nearby-nails");
    expect(body.data.providers[0].distance).toBeDefined();
    expect(body.data.providers[0].distance).toBeLessThan(25);
  });

  it("returns empty when no providers match location", async () => {
    // Provider is far away (different continent)
    const farProvider = createProviderResult({
      id: "provider_far",
      locationLat: 51.5074, // London
      locationLng: -0.1278,
    });

    mockProviderFindMany.mockResolvedValue([farProvider] as any);

    const request = createMockRequest("GET", "/api/providers/search", {
      searchParams: {
        lat: "40.7128",
        lng: "-74.006",
        radiusMiles: "10",
      },
    });

    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    // Haversine post-filter should exclude the far provider
    expect(body.data.providers).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });

  it("applies category filter", async () => {
    mockProviderFindMany.mockResolvedValue([]);

    const request = createMockRequest("GET", "/api/providers/search", {
      searchParams: { category: "NAILS" },
    });

    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.data.providers).toHaveLength(0);

    // Verify the category was included in the Prisma query
    expect(mockProviderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "NAILS",
        }),
      })
    );
  });

  it("rejects invalid category value", async () => {
    const request = createMockRequest("GET", "/api/providers/search", {
      searchParams: { category: "INVALID_CATEGORY" },
    });

    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(422);
    expect(body.error.message).toBe("Invalid search parameters");
  });

  it("returns providers without location when no lat/lng specified", async () => {
    const provider = createProviderResult();
    mockProviderFindMany.mockResolvedValue([provider] as any);

    const request = createMockRequest("GET", "/api/providers/search");
    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.data.providers).toHaveLength(1);
    expect(body.data.providers[0].distance).toBeNull();
  });

  it("computes average rating from public feedback", async () => {
    const providerWithReviews = createProviderResult({
      feedback: [
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
      ],
    });
    mockProviderFindMany.mockResolvedValue([providerWithReviews] as any);

    const request = createMockRequest("GET", "/api/providers/search");
    const response = await GET(request);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.data.providers[0].avgRating).toBe(4);
    expect(body.data.providers[0].reviewCount).toBe(3);
  });

  it("returns null avgRating when no reviews exist", async () => {
    const provider = createProviderResult({ feedback: [] });
    mockProviderFindMany.mockResolvedValue([provider] as any);

    const request = createMockRequest("GET", "/api/providers/search");
    const response = await GET(request);
    const { body } = await parseResponse(response);

    expect(body.data.providers[0].avgRating).toBeNull();
    expect(body.data.providers[0].reviewCount).toBe(0);
  });

  it("sorts providers by distance when location is provided", async () => {
    const providers = [
      createProviderResult({
        id: "far",
        slug: "far-nails",
        businessName: "Far Nails",
        locationLat: 40.75,
        locationLng: -73.98,
      }),
      createProviderResult({
        id: "close",
        slug: "close-nails",
        businessName: "Close Nails",
        locationLat: 40.7129,
        locationLng: -74.0059,
      }),
    ];
    mockProviderFindMany.mockResolvedValue(providers as any);

    const request = createMockRequest("GET", "/api/providers/search", {
      searchParams: {
        lat: "40.7128",
        lng: "-74.006",
        radiusMiles: "25",
      },
    });

    const response = await GET(request);
    const { body } = await parseResponse(response);

    expect(body.data.providers).toHaveLength(2);
    // Closest first
    expect(body.data.providers[0].slug).toBe("close-nails");
    expect(body.data.providers[1].slug).toBe("far-nails");
    expect(body.data.providers[0].distance).toBeLessThan(body.data.providers[1].distance);
  });

  it("includes portfolioThumbnail from first media asset", async () => {
    const provider = createProviderResult({
      mediaAssets: [{ thumbnailUrl: "https://cdn.example.com/thumb.jpg", url: "https://cdn.example.com/full.jpg" }],
    });
    mockProviderFindMany.mockResolvedValue([provider] as any);

    const request = createMockRequest("GET", "/api/providers/search");
    const response = await GET(request);
    const { body } = await parseResponse(response);

    expect(body.data.providers[0].portfolioThumbnail).toBe("https://cdn.example.com/thumb.jpg");
  });

  it("respects limit and offset for pagination", async () => {
    mockProviderFindMany.mockResolvedValue([]);

    const request = createMockRequest("GET", "/api/providers/search", {
      searchParams: { limit: "5", offset: "10" },
    });

    const response = await GET(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
    // The route over-fetches (no location, so fetchLimit = limit), then slices
    expect(mockProviderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 15, // limit (5) + offset (10)
        skip: 0,
      })
    );
  });
});
