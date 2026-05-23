import { Resend } from "resend";
import { renderTemplate, getTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";
import type { MessageTemplateType } from "@nailbook/db";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

type SendEmailParams = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
};

async function sendEmail({ to, subject, htmlBody, textBody }: SendEmailParams) {
  const client = getClient();
  if (!client) {
    console.log(`[email-dev] To: ${to}`);
    console.log(`[email-dev] Subject: ${subject}`);
    console.log(`[email-dev] Body:\n${textBody}`);
    console.log("[email-dev] ---");
    return;
  }
  await client.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: htmlBody,
    text: textBody,
  });
}

// ─── Shared helpers ────────────────────────────────────────

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDateTime(date: Date, timezone = "UTC") {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function toCalendarDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function buildGoogleCalendarUrl(params: {
  serviceName: string;
  providerName: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  location?: string | null;
}) {
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: `${params.serviceName} — ${params.providerName}`,
    dates: `${toCalendarDate(params.startTime)}/${toCalendarDate(params.endTime)}`,
    details: `Booked via PoroBook\nService: ${params.serviceName}\nDuration: ${params.durationMinutes} min`,
    ...(params.location ? { location: params.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

// ─── Helper: wrap plain text body in styled HTML ──────────

function wrapHtml(textBody: string): string {
  const escaped = textBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  return `<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.6;">${escaped}</div>`;
}

// ─── Helper: load template, render, and send ──────────────

async function sendTemplateEmail(
  to: string,
  type: MessageTemplateType,
  vars: Record<string, string>,
  providerId?: string,
) {
  let tpl: { emailSubject: string; emailBody: string; smsBody: string };
  if (providerId) {
    tpl = await getTemplate(providerId, type);
  } else {
    tpl = DEFAULT_TEMPLATES[type];
  }

  const subject = renderTemplate(tpl.emailSubject, vars);
  const textBody = renderTemplate(tpl.emailBody, vars);
  const htmlBody = wrapHtml(textBody);

  await sendEmail({ to, subject, htmlBody, textBody });
}

// ─── Email data type ───────────────────────────────────────

export type BookingEmailData = {
  providerName: string;
  serviceName: string;
  durationMinutes: number;
  startTime: Date;
  endTime: Date;
  totalInCents: number;
  depositInCents: number;
  paymentType: "CASH" | "DEPOSIT" | "FULL" | "FREE";
  locationAddress?: string | null;
  cancellationHours: number;
  arrivalGraceMinutes: number;
  clientName?: string | null;
  clientEmail?: string | null;
  timezone?: string;
  // Self-manage link
  slug?: string;
  appointmentId?: string;
  manageToken?: string;
};

// ─── Build vars from booking data ─────────────────────────

function buildBookingVars(data: BookingEmailData): Record<string, string> {
  const tz = data.timezone || "America/New_York";
  const calUrl = buildGoogleCalendarUrl({
    serviceName: data.serviceName,
    providerName: data.providerName,
    startTime: data.startTime,
    endTime: data.endTime,
    durationMinutes: data.durationMinutes,
    location: data.locationAddress,
  });

  let paymentLine: string;
  if (data.paymentType === "FREE") {
    paymentLine = "Free — discount applied";
  } else if (data.paymentType === "CASH") {
    paymentLine = `Pay at appointment: ${formatPrice(data.totalInCents)}`;
  } else if (data.paymentType === "DEPOSIT") {
    paymentLine = `Deposit paid: ${formatPrice(data.depositInCents)} — Remaining: ${formatPrice(data.totalInCents - data.depositInCents)} due at appointment`;
  } else {
    paymentLine = `Paid: ${formatPrice(data.totalInCents)}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const manageUrl =
    data.slug && data.appointmentId && data.manageToken
      ? `${baseUrl}/${data.slug}/manage/${data.appointmentId}?token=${data.manageToken}`
      : "";

  return {
    providerName: data.providerName,
    serviceName: data.serviceName,
    clientName: data.clientName || "Client",
    clientEmail: data.clientEmail || "",
    dateTime: formatDateTime(data.startTime, tz),
    duration: String(data.durationMinutes),
    total: formatPrice(data.totalInCents),
    deposit: formatPrice(data.depositInCents),
    paymentLine,
    location: data.locationAddress ? `Location: ${data.locationAddress}\n` : "",
    cancellationHours: String(data.cancellationHours),
    arrivalGraceMinutes: String(data.arrivalGraceMinutes),
    calendarUrl: calUrl,
    manageUrl,
  };
}

// ─── Client confirmation email ─────────────────────────────

export async function sendClientConfirmation(
  data: BookingEmailData,
  providerId?: string,
) {
  if (!data.clientEmail) return;
  const vars = buildBookingVars(data);
  await sendTemplateEmail(data.clientEmail, "BOOKING_CONFIRMATION", vars, providerId);
}

// ─── Provider notification email ───────────────────────────

export async function sendProviderNewBooking(
  providerEmail: string,
  data: BookingEmailData,
  providerId?: string,
) {
  const vars = buildBookingVars(data);
  await sendTemplateEmail(providerEmail, "BOOKING_NOTIFICATION", vars, providerId);
}

// ─── Cancellation email (client) ──────────────────────────

export type CancellationEmailData = {
  providerName: string;
  serviceName: string;
  startTime: Date;
  clientName?: string | null;
  clientEmail?: string | null;
  cancelledBy: "client" | "provider";
  timezone?: string;
};

export async function sendCancellationEmail(
  data: CancellationEmailData,
  providerId?: string,
) {
  if (!data.clientEmail) return;

  const cancellerText =
    data.cancelledBy === "provider"
      ? `${data.providerName} has cancelled`
      : "You have cancelled";

  const vars: Record<string, string> = {
    providerName: data.providerName,
    serviceName: data.serviceName,
    clientName: data.clientName || "Client",
    clientEmail: data.clientEmail || "",
    dateTime: formatDateTime(data.startTime, data.timezone),
    cancelledBy: cancellerText,
  };

  await sendTemplateEmail(data.clientEmail, "CANCELLATION", vars, providerId);
}

// ─── Cancellation notification (provider) ─────────────────

export async function sendProviderCancellation(
  providerEmail: string,
  data: CancellationEmailData,
  providerId?: string,
) {
  const clientDisplay = data.clientName || data.clientEmail || "A client";
  const vars: Record<string, string> = {
    providerName: data.providerName,
    serviceName: data.serviceName,
    clientName: clientDisplay,
    clientEmail: data.clientEmail || "",
    dateTime: formatDateTime(data.startTime, data.timezone),
    cancelledBy: `${clientDisplay} has cancelled`,
  };

  await sendTemplateEmail(providerEmail, "CANCELLATION", vars, providerId);
}

// ─── Completion / thank you email ─────────────────────────

export type CompletionEmailData = {
  providerName: string;
  serviceName: string;
  startTime: Date;
  clientName?: string | null;
  clientEmail?: string | null;
  timezone?: string;
  appointmentId?: string;
  slug?: string;
  totalInCents?: number;
  depositInCents?: number;
  paymentUrl?: string;
};

export async function sendCompletionThankYou(
  data: CompletionEmailData,
  providerId?: string,
) {
  if (!data.clientEmail) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const feedbackUrl =
    data.slug && data.appointmentId
      ? `${baseUrl}/${data.slug}/feedback/${data.appointmentId}`
      : "";

  let balanceSection = "";
  if (data.paymentUrl && data.totalInCents && data.depositInCents) {
    const remaining = data.totalInCents - data.depositInCents;
    if (remaining > 0) {
      balanceSection = `\n\nYou have a remaining balance of ${formatPrice(remaining)}. Pay online: ${data.paymentUrl}`;
    }
  }

  const tipBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const tipUrl =
    data.slug && data.appointmentId
      ? `Leave a tip: ${tipBaseUrl}/${data.slug}/tip/${data.appointmentId}`
      : "";

  const vars: Record<string, string> = {
    providerName: data.providerName,
    serviceName: data.serviceName,
    clientName: data.clientName || "Client",
    clientEmail: data.clientEmail || "",
    dateTime: formatDateTime(data.startTime, data.timezone),
    feedbackUrl,
    balanceSection,
    tipUrl,
  };

  await sendTemplateEmail(data.clientEmail, "COMPLETION", vars, providerId);
}

// ─── Waitlist available email ─────────────────────────────

export type WaitlistEmailData = {
  providerName: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  date: string; // formatted date string
  bookingUrl: string;
};

export async function sendWaitlistAvailableEmail(
  data: WaitlistEmailData,
  providerId?: string,
) {
  const vars: Record<string, string> = {
    providerName: data.providerName,
    serviceName: data.serviceName,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    date: data.date,
    bookingUrl: data.bookingUrl,
  };

  await sendTemplateEmail(data.clientEmail, "WAITLIST_AVAILABLE", vars, providerId);
}

// ─── Waitlist joined confirmation email ──────────────────

export type WaitlistJoinedEmailData = {
  providerName: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  date: string; // formatted date string
  time?: string; // formatted time string (for slot-specific waitlist)
};

export async function sendWaitlistJoinedEmail(
  data: WaitlistJoinedEmailData,
  providerId?: string,
) {
  const vars: Record<string, string> = {
    providerName: data.providerName,
    serviceName: data.serviceName,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    date: data.date,
    time: data.time ? ` at ${data.time}` : "",
  };

  await sendTemplateEmail(data.clientEmail, "WAITLIST_JOINED", vars, providerId);
}

// ─── Balance request email ────────────────────────────────

export type BalanceRequestEmailData = {
  providerName: string;
  serviceName: string;
  startTime: Date;
  totalInCents: number;
  depositInCents: number;
  remainingInCents: number;
  clientName?: string | null;
  clientEmail?: string | null;
  timezone?: string;
  paymentUrl: string;
};

export async function sendBalanceRequest(
  data: BalanceRequestEmailData,
  providerId?: string,
) {
  if (!data.clientEmail) return;

  const vars: Record<string, string> = {
    providerName: data.providerName,
    serviceName: data.serviceName,
    clientName: data.clientName || "Client",
    clientEmail: data.clientEmail || "",
    dateTime: formatDateTime(data.startTime, data.timezone),
    total: formatPrice(data.totalInCents),
    deposit: formatPrice(data.depositInCents),
    remainingBalance: formatPrice(data.remainingInCents),
    paymentUrl: data.paymentUrl,
  };

  await sendTemplateEmail(data.clientEmail, "BALANCE_REQUEST", vars, providerId);
}

// ─── Reminder email ───────────────────────────────────────

export async function sendAppointmentReminder(
  to: string,
  providerName: string,
  serviceName: string,
  dateTime: string,
  hoursUntil: number,
  providerId?: string,
) {
  const vars: Record<string, string> = {
    providerName,
    serviceName,
    clientName: "",
    clientEmail: to,
    dateTime,
    hoursUntil: String(hoursUntil),
  };

  await sendTemplateEmail(to, "REMINDER", vars, providerId);
}
