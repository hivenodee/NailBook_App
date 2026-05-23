export type BookingStep = "time" | "details" | "intake" | "review";

export type IntakeQuestionData = {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
  isRequired: boolean;
  sortOrder: number;
};

export type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

export type AddOnGroupData = {
  id: string;
  name: string;
  rule: "OPTIONAL" | "EXACTLY_ONE" | "AT_LEAST_ONE";
  sortOrder: number;
};

export type AddOnData = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
  groupId: string | null;
  isMandatory: boolean;
  sortOrder: number;
};

export type ServiceData = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
  depositType: "NONE" | "FLAT" | "PERCENT";
  depositValue: number;
  addOns: AddOnData[];
  addOnGroups: AddOnGroupData[];
  provider: {
    businessName: string;
    slug: string;
    timezone: string;
    cancellationHours: number;
    arrivalGraceMinutes: number;
    acceptsCash: boolean;
    acceptsCard: boolean;
    acceptsApplePay: boolean;
    acceptsGooglePay: boolean;
    acceptsCashAppPay: boolean;
    booksOpen: boolean;
    booksOpenAt: string | null;
    bookingWindowDays: number;
  };
};

export type PaymentMethod =
  | "CARD"
  | "APPLE_PAY"
  | "GOOGLE_PAY"
  | "CASH_APP_PAY"
  | "CASH";

export type RecurrenceFreq = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export type WaitlistTimePref = "ANY" | "MORNING" | "AFTERNOON" | "EVENING";

export type AppliedCoupon = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
};
