import { ServerClient } from "postmark";

let _client: ServerClient | null = null;

function getClient(): ServerClient | null {
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    return null;
  }
  if (!_client) {
    _client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN);
  }
  return _client;
}

const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || "bookings@nailbook.com";

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
  await client.sendEmail({
    From: FROM_EMAIL,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
  });
}

// ─── Shared helpers ────────────────────────────────────────

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
    details: `Booked via NailBook\nService: ${params.serviceName}\nDuration: ${params.durationMinutes} min`,
    ...(params.location ? { location: params.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
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
  paymentType: "CASH" | "DEPOSIT" | "FULL";
  locationAddress?: string | null;
  cancellationHours: number;
  arrivalGraceMinutes: number;
  clientName?: string | null;
  clientEmail?: string | null;
};

// ─── Client confirmation email ─────────────────────────────

export async function sendClientConfirmation(data: BookingEmailData) {
  if (!data.clientEmail) return;

  const calUrl = buildGoogleCalendarUrl({
    serviceName: data.serviceName,
    providerName: data.providerName,
    startTime: data.startTime,
    endTime: data.endTime,
    durationMinutes: data.durationMinutes,
    location: data.locationAddress,
  });

  const dateStr = formatDateTime(data.startTime);

  // Payment line
  let paymentLine: string;
  if (data.paymentType === "CASH") {
    paymentLine = `Pay at appointment: ${formatPrice(data.totalInCents)}`;
  } else if (data.paymentType === "DEPOSIT") {
    paymentLine = `Deposit paid: ${formatPrice(data.depositInCents)} — Remaining: ${formatPrice(data.totalInCents - data.depositInCents)} due at appointment`;
  } else {
    paymentLine = `Paid: ${formatPrice(data.totalInCents)}`;
  }

  const locationHtml = data.locationAddress
    ? `<tr><td style="padding:4px 0;color:#666;">Location</td><td style="padding:4px 0;">${data.locationAddress}</td></tr>`
    : "";
  const locationText = data.locationAddress
    ? `Location: ${data.locationAddress}\n`
    : "";

  const htmlBody = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <h2 style="font-size:20px;font-weight:600;margin-bottom:16px;">You're booked!</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
    <tr><td style="padding:4px 0;color:#666;">Service</td><td style="padding:4px 0;">${data.serviceName}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">With</td><td style="padding:4px 0;">${data.providerName}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">When</td><td style="padding:4px 0;">${dateStr}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Duration</td><td style="padding:4px 0;">${data.durationMinutes} min</td></tr>
    ${locationHtml}
    <tr><td style="padding:4px 0;color:#666;">Payment</td><td style="padding:4px 0;">${paymentLine}</td></tr>
  </table>
  <p style="font-size:13px;color:#666;margin-bottom:16px;">
    Cancellation: at least ${data.cancellationHours}h in advance for a full refund.<br/>
    Arrival: please arrive within ${data.arrivalGraceMinutes} minutes of your appointment time.
  </p>
  <a href="${calUrl}" style="display:inline-block;padding:10px 20px;background:#6B4C9A;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Add to Calendar</a>
</div>`;

  const textBody = `You're booked!

Service: ${data.serviceName}
With: ${data.providerName}
When: ${dateStr}
Duration: ${data.durationMinutes} min
${locationText}${paymentLine}

Cancellation: at least ${data.cancellationHours}h in advance for a full refund.
Arrival: please arrive within ${data.arrivalGraceMinutes} minutes of your appointment time.

Add to Calendar: ${calUrl}`;

  await sendEmail({
    to: data.clientEmail,
    subject: `Booking Confirmed — ${data.providerName}`,
    htmlBody,
    textBody,
  });
}

// ─── Provider notification email ───────────────────────────

export async function sendProviderNewBooking(
  providerEmail: string,
  data: BookingEmailData
) {
  const dateStr = formatDateTime(data.startTime);
  const clientDisplay = data.clientName || data.clientEmail || "A client";

  let paymentLine: string;
  if (data.paymentType === "CASH") {
    paymentLine = `Cash — ${formatPrice(data.totalInCents)} due at appointment`;
  } else if (data.paymentType === "DEPOSIT") {
    paymentLine = `Deposit paid: ${formatPrice(data.depositInCents)} — Remaining: ${formatPrice(data.totalInCents - data.depositInCents)}`;
  } else {
    paymentLine = `Paid in full: ${formatPrice(data.totalInCents)}`;
  }

  const htmlBody = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <h2 style="font-size:20px;font-weight:600;margin-bottom:16px;">New Booking</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
    <tr><td style="padding:4px 0;color:#666;">Client</td><td style="padding:4px 0;">${clientDisplay}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Service</td><td style="padding:4px 0;">${data.serviceName}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">When</td><td style="padding:4px 0;">${dateStr}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Duration</td><td style="padding:4px 0;">${data.durationMinutes} min</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Payment</td><td style="padding:4px 0;">${paymentLine}</td></tr>
  </table>
</div>`;

  const textBody = `New Booking

Client: ${clientDisplay}
Service: ${data.serviceName}
When: ${dateStr}
Duration: ${data.durationMinutes} min
Payment: ${paymentLine}`;

  await sendEmail({
    to: providerEmail,
    subject: `New Booking — ${data.serviceName} with ${clientDisplay}`,
    htmlBody,
    textBody,
  });
}

// ─── Reminder email (kept for worker) ──────────────────────

export async function sendAppointmentReminder(
  to: string,
  providerName: string,
  serviceName: string,
  dateTime: string,
  hoursUntil: number
) {
  const htmlBody = `
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <h2 style="font-size:20px;font-weight:600;margin-bottom:16px;">Appointment Reminder</h2>
  <p style="font-size:14px;"><strong>${serviceName}</strong> with ${providerName}</p>
  <p style="font-size:14px;">${dateTime}</p>
</div>`;

  const textBody = `Appointment Reminder\n\n${serviceName} with ${providerName}\n${dateTime}`;

  await sendEmail({
    to,
    subject: `Reminder: ${serviceName} in ${hoursUntil}h`,
    htmlBody,
    textBody,
  });
}
