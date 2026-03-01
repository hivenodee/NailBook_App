import { vi } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
  currentUser: vi.fn().mockResolvedValue(null),
}));

// Mock Prisma — the app re-exports from @nailbook/db via @/lib/db
const mockPrisma = {
  provider: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  appointment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  service: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  payment: {
    findMany: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
  },
  providerClient: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  feedback: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  coupon: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  mediaAsset: { findMany: vi.fn() },
  waitlistEntry: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  exportJob: { findMany: vi.fn(), create: vi.fn() },
  availabilityRule: { findMany: vi.fn() },
  timeOff: { findMany: vi.fn() },
  appointmentEvent: { create: vi.fn() },
  messageTemplate: { findMany: vi.fn(), findFirst: vi.fn() },
  addOn: { findMany: vi.fn() },
  addOnGroup: { findMany: vi.fn() },
  intakeResponse: { createMany: vi.fn() },
  $transaction: vi.fn((fn: any) =>
    fn({
      appointment: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
      payment: { create: vi.fn() },
      appointmentEvent: { create: vi.fn() },
      providerClient: { upsert: vi.fn() },
      coupon: { update: vi.fn() },
      intakeResponse: { createMany: vi.fn() },
    })
  ),
};

vi.mock("@nailbook/db", () => ({
  prisma: mockPrisma,
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
        this.name = "PrismaClientKnownRequestError";
      }
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock rate limiting — always allow
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
  strictRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock cache invalidation
vi.mock("@/lib/cache", () => ({
  invalidateAvailability: vi.fn().mockResolvedValue(undefined),
  invalidateAllAvailability: vi.fn().mockResolvedValue(undefined),
  invalidateAvailabilityRange: vi.fn().mockResolvedValue(undefined),
}));

// Mock email
vi.mock("@/lib/email", () => ({
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendProviderCancellation: vi.fn().mockResolvedValue(undefined),
  sendCompletionThankYou: vi.fn().mockResolvedValue(undefined),
  sendClientConfirmation: vi.fn().mockResolvedValue(undefined),
  sendProviderNewBooking: vi.fn().mockResolvedValue(undefined),
  formatDateTime: vi.fn().mockReturnValue("March 15, 2026 9:00 AM EDT"),
}));

// Mock SMS
vi.mock("@/lib/sms", () => ({
  sendCancellationSms: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationSms: vi.fn().mockResolvedValue(undefined),
}));

// Mock schedule-jobs
vi.mock("@/lib/schedule-jobs", () => ({
  cancelReminders: vi.fn().mockResolvedValue(undefined),
  scheduleReminders: vi.fn().mockResolvedValue(undefined),
  scheduleFollowup: vi.fn().mockResolvedValue(undefined),
}));

// Mock waitlist
vi.mock("@/lib/waitlist", () => ({
  notifyWaitlistForDate: vi.fn().mockResolvedValue(undefined),
}));

// Mock sanitize
vi.mock("@/lib/sanitize", () => ({
  sanitizeText: vi.fn((input: string) => input),
  sanitizeObject: vi.fn((obj: any) => obj),
}));
