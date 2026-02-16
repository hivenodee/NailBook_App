// Appointment statuses
export const APPOINTMENT_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

// Payment statuses
export const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
] as const;

// Payout statuses
export const PAYOUT_STATUSES = [
  "INITIATED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

// Deposit types
export const DEPOSIT_TYPES = ["NONE", "FLAT", "PERCENT"] as const;

// Payment methods
export const PAYMENT_METHODS = [
  "CARD",
  "APPLE_PAY",
  "GOOGLE_PAY",
  "CASH_APP_PAY",
  "CASH",
] as const;

// User roles
export const USER_ROLES = ["CLIENT", "PROVIDER", "ADMIN"] as const;

// Days of week
export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// Notification triggers
export const REMINDER_HOURS = {
  FIRST: 24,
  SECOND: 2,
} as const;

// Media limits
export const MEDIA_LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/quicktime"],
  MAX_PORTFOLIO_ITEMS: 50,
} as const;

// Waitlist
export const WAITLIST = {
  NOTIFICATION_COOLDOWN_HOURS: 4,
} as const;

// Booking flow
export const BOOKING = {
  DEFAULT_GRACE_MINUTES: 15,
  DEFAULT_CANCELLATION_HOURS: 24,
  SLOT_INCREMENT_MINUTES: 15,
  MAX_ADVANCE_DAYS: 90,
} as const;
