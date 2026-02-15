import { z } from "zod";

// ─── Provider ──────────────────────────────────────────────

export const createProviderSchema = z.object({
  businessName: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  bio: z.string().max(500).optional(),
  locationAddress: z.string().max(200).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  instagramUrl: z.string().url().optional().or(z.literal("")),
  tiktokUrl: z.string().url().optional().or(z.literal("")),
});

export const updateProviderSchema = createProviderSchema.partial();

// ─── Service ───────────────────────────────────────────────

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priceInCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(15).max(480),
  depositType: z.enum(["NONE", "FLAT", "PERCENT"]).default("NONE"),
  depositValue: z.number().int().min(0).default(0),
});

export const updateServiceSchema = createServiceSchema.partial();

// ─── Availability ──────────────────────────────────────────

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  isActive: z.boolean().default(true),
});

export const timeOffSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(200).optional(),
});

// ─── Booking ───────────────────────────────────────────────

export const createBookingSchema = z.object({
  serviceId: z.string().cuid(),
  startTime: z.string().datetime(),
  // For web bookings without auth
  clientName: z.string().min(1).max(100).optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().max(20).optional(),
  // Optional inspiration photo
  inspirationUrl: z.string().url().optional(),
  // Selected add-ons
  addOnIds: z.array(z.string().cuid()).max(20).optional(),
  paymentMethod: z.enum([
    "CARD",
    "APPLE_PAY",
    "GOOGLE_PAY",
    "CASH_APP_PAY",
    "CASH",
  ]),
});

// ─── AddOn ─────────────────────────────────────────────────

export const createAddOnSchema = z.object({
  name: z.string().min(1).max(100),
  priceInCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(0).max(120).default(0),
});

// ─── Message ───────────────────────────────────────────────

export const sendMessageSchema = z.object({
  threadId: z.string().cuid(),
  body: z.string().min(1).max(2000),
});

// ─── Review ────────────────────────────────────────────────

export const createReviewSchema = z.object({
  appointmentId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
});

// ─── Provider Settings ─────────────────────────────────────

export const providerSettingsSchema = z.object({
  acceptsCard: z.boolean().optional(),
  acceptsApplePay: z.boolean().optional(),
  acceptsGooglePay: z.boolean().optional(),
  acceptsCashAppPay: z.boolean().optional(),
  acceptsCash: z.boolean().optional(),
  instantBook: z.boolean().optional(),
  requireInspirationPhoto: z.boolean().optional(),
  arrivalGraceMinutes: z.number().int().min(0).max(60).optional(),
  cancellationHours: z.number().int().min(0).max(168).optional(),
  noShowFeePercent: z.number().int().min(0).max(100).optional(),
});
