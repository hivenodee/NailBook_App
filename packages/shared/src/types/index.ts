import type { z } from "zod";
import type {
  createProviderSchema,
  updateProviderSchema,
  createServiceSchema,
  updateServiceSchema,
  availabilityRuleSchema,
  timeOffSchema,
  createBookingSchema,
  createAddOnSchema,
  sendMessageSchema,
  submitFeedbackSchema,
  providerSettingsSchema,
} from "../validation";

// Inferred types from zod schemas
export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;
export type TimeOffInput = z.infer<typeof timeOffSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateAddOnInput = z.infer<typeof createAddOnSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type ProviderSettingsInput = z.infer<typeof providerSettingsSchema>;

// API response wrapper
export type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: {
    message: string;
    code?: string;
  };
};

// Time slot for availability display
export type TimeSlot = {
  startTime: string; // ISO datetime
  endTime: string;
  available: boolean;
};

// Public provider profile (returned on public pages)
export type PublicProviderProfile = {
  slug: string;
  businessName: string;
  bio: string | null;
  locationAddress: string | null;
  coverImageUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  isVerified: boolean;
  acceptsCard: boolean;
  acceptsApplePay: boolean;
  acceptsGooglePay: boolean;
  acceptsCashAppPay: boolean;
  acceptsCash: boolean;
  arrivalGraceMinutes: number;
  cancellationHours: number;
  services: PublicService[];
  portfolio: PortfolioItem[];
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  durationMinutes: number;
  depositType: "NONE" | "FLAT" | "PERCENT";
  depositValue: number;
  addOns: { id: string; name: string; priceInCents: number; durationMinutes: number }[];
};

export type PortfolioItem = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
};
