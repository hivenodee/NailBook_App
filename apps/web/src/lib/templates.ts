import { prisma } from "@/lib/db";
import type { MessageTemplateType } from "@nailbook/db";

// ─── Variable definitions per template type ───────────────

const COMMON_VARS = [
  "providerName",
  "serviceName",
  "clientName",
  "clientEmail",
] as const;

export const VARIABLES_BY_TYPE: Record<MessageTemplateType, readonly string[]> = {
  BOOKING_CONFIRMATION: [
    ...COMMON_VARS,
    "dateTime",
    "duration",
    "total",
    "deposit",
    "paymentLine",
    "location",
    "cancellationHours",
    "arrivalGraceMinutes",
    "calendarUrl",
    "manageUrl",
  ],
  BOOKING_NOTIFICATION: [
    ...COMMON_VARS,
    "dateTime",
    "duration",
    "total",
    "paymentLine",
  ],
  CANCELLATION: [...COMMON_VARS, "dateTime", "cancelledBy"],
  COMPLETION: [...COMMON_VARS, "dateTime", "feedbackUrl", "balanceSection", "tipUrl"],
  REMINDER: [...COMMON_VARS, "dateTime", "hoursUntil"],
  FOLLOWUP: [...COMMON_VARS, "dateTime"],
  WAITLIST_AVAILABLE: [...COMMON_VARS, "date", "bookingUrl"],
  WAITLIST_JOINED: [...COMMON_VARS, "date", "time"],
  BALANCE_REQUEST: [
    ...COMMON_VARS,
    "dateTime",
    "total",
    "deposit",
    "remainingBalance",
    "paymentUrl",
  ],
  TIP_REQUEST: [
    ...COMMON_VARS,
    "dateTime",
    "tipUrl",
  ],
};

// ─── Default templates (extracted from existing hardcoded emails) ──

export const DEFAULT_TEMPLATES: Record<
  MessageTemplateType,
  { emailSubject: string; emailBody: string; smsBody: string }
> = {
  BOOKING_CONFIRMATION: {
    emailSubject: "Booking Confirmed — {{providerName}}",
    emailBody: `You're booked!

Service: {{serviceName}}
With: {{providerName}}
When: {{dateTime}}
Duration: {{duration}} min
{{location}}{{paymentLine}}

Cancellation: at least {{cancellationHours}}h in advance for a full refund.
Arrival: please arrive within {{arrivalGraceMinutes}} minutes of your appointment time.

Manage your booking: {{manageUrl}}
Add to Calendar: {{calendarUrl}}`,
    smsBody:
      "Confirmed: {{serviceName}} with {{providerName}} on {{dateTime}}. {{paymentLine}} Manage: {{manageUrl}}",
  },
  BOOKING_NOTIFICATION: {
    emailSubject: "New Booking — {{serviceName}} with {{clientName}}",
    emailBody: `New Booking

Client: {{clientName}}
Service: {{serviceName}}
When: {{dateTime}}
Duration: {{duration}} min
Payment: {{paymentLine}}`,
    smsBody:
      "New booking: {{clientName}} — {{serviceName}} on {{dateTime}}",
  },
  CANCELLATION: {
    emailSubject: "Appointment Cancelled — {{providerName}}",
    emailBody: `Appointment Cancelled

{{cancelledBy}} your upcoming appointment.

Service: {{serviceName}}
With: {{providerName}}
Was scheduled: {{dateTime}}

If a deposit was paid, refund eligibility depends on the provider's cancellation policy.`,
    smsBody:
      "Your {{serviceName}} appointment with {{providerName}} has been cancelled.",
  },
  COMPLETION: {
    emailSubject: "Thanks for visiting {{providerName}}!",
    emailBody: `Thanks for your visit!

We hope you loved your {{serviceName}} with {{providerName}}.

Service: {{serviceName}}
With: {{providerName}}
Date: {{dateTime}}
{{balanceSection}}
Leave feedback: {{feedbackUrl}}
{{tipUrl}}`,
    smsBody:
      "Thanks for your visit! We hope you loved your {{serviceName}} with {{providerName}}.",
  },
  REMINDER: {
    emailSubject: "Reminder: {{serviceName}} in {{hoursUntil}}h",
    emailBody: `Appointment Reminder

{{serviceName}} with {{providerName}}
{{dateTime}}`,
    smsBody:
      "Reminder: {{serviceName}} with {{providerName}} on {{dateTime}}",
  },
  FOLLOWUP: {
    emailSubject: "How was your visit with {{providerName}}?",
    emailBody: `We hope you enjoyed your {{serviceName}} with {{providerName}} on {{dateTime}}.

We'd love to hear how it went!`,
    smsBody:
      "How was your {{serviceName}} with {{providerName}}? We'd love to hear!",
  },
  WAITLIST_AVAILABLE: {
    emailSubject: "A spot opened up with {{providerName}}!",
    emailBody: `Great news, {{clientName}}!

A spot just opened up for {{serviceName}} with {{providerName}} on {{date}}.

Book now before it's taken: {{bookingUrl}}`,
    smsBody:
      "A spot opened up for {{serviceName}} with {{providerName}} on {{date}}! Book now: {{bookingUrl}}",
  },
  WAITLIST_JOINED: {
    emailSubject: "You're on the waitlist — {{providerName}}",
    emailBody: `Hi {{clientName}},

You've been added to the waitlist for {{serviceName}} with {{providerName}} on {{date}}.{{time}}

We'll notify you as soon as a spot opens up. No action needed on your end until then.`,
    smsBody:
      "You're on the waitlist for {{serviceName}} with {{providerName}} on {{date}}.{{time}} We'll let you know when a spot opens up!",
  },
  TIP_REQUEST: {
    emailSubject: "Leave a tip for {{providerName}}",
    emailBody: `Hi {{clientName}},

Thanks for your {{serviceName}} with {{providerName}} on {{dateTime}}.

If you'd like to leave a tip, you can do so here: {{tipUrl}}`,
    smsBody:
      "Thanks for visiting {{providerName}}! Leave a tip: {{tipUrl}}",
  },
  BALANCE_REQUEST: {
    emailSubject: "Remaining balance — {{providerName}}",
    emailBody: `Hi {{clientName}},

Thanks for your {{serviceName}} with {{providerName}} on {{dateTime}}.

Here's your payment summary:
Total: {{total}}
Deposit paid: {{deposit}}
Remaining balance: {{remainingBalance}}

Pay your remaining balance online: {{paymentUrl}}`,
    smsBody:
      "Hi {{clientName}}, you have a remaining balance of {{remainingBalance}} for {{serviceName}} with {{providerName}}. Pay here: {{paymentUrl}}",
  },
};

// ─── Template rendering ───────────────────────────────────

/** Replace {{var}} placeholders with values. Unknown vars are left as-is. */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in vars ? vars[key] : match;
  });
}

// ─── Load provider template (or fall back to defaults) ────

export async function getTemplate(
  providerId: string,
  type: MessageTemplateType
): Promise<{ emailSubject: string; emailBody: string; smsBody: string }> {
  const defaults = DEFAULT_TEMPLATES[type];

  const custom = await prisma.messageTemplate.findUnique({
    where: { providerId_type: { providerId, type } },
  });

  if (!custom || !custom.isActive) return defaults;

  return {
    emailSubject: custom.emailSubject || defaults.emailSubject,
    emailBody: custom.emailBody || defaults.emailBody,
    smsBody: custom.smsBody || defaults.smsBody,
  };
}

// ─── Sample data for preview ──────────────────────────────

export const SAMPLE_VARS: Record<string, string> = {
  providerName: "Glamour Nails",
  serviceName: "Gel Full Set",
  clientName: "Jane Doe",
  clientEmail: "jane@example.com",
  dateTime: "Saturday, March 15 at 2:00 PM",
  duration: "90",
  total: "$85.00",
  deposit: "$25.00",
  paymentLine: "Deposit paid: $25.00 — Remaining: $60.00 due at appointment",
  location: "123 Main St, Suite 4",
  cancellationHours: "24",
  arrivalGraceMinutes: "15",
  calendarUrl: "https://calendar.google.com/calendar/render?...",
  cancelledBy: "You have cancelled",
  hoursUntil: "24",
  date: "Saturday, March 15",
  time: " at 2:00 PM",
  bookingUrl: "https://nailbook.app/glamour-nails/book?service=abc&date=2026-03-15",
  feedbackUrl: "https://nailbook.app/glamour-nails/feedback/abc123",
  balanceSection: "",
  remainingBalance: "$60.00",
  paymentUrl: "https://nailbook.app/glamour-nails/pay/abc123",
  manageUrl: "https://nailbook.app/glamour-nails/manage/abc123?token=xxx",
  tipUrl: "Leave a tip: https://nailbook.app/glamour-nails/tip/abc123",
};
