import twilio from "twilio";
import { renderTemplate, getTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";
import type { MessageTemplateType } from "@nailbook/db";

// ─── Twilio client (lazy init) ────────────────────────────

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  if (!_client) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

// ─── Core send function ───────────────────────────────────

type SmsParams = {
  to: string;
  body: string;
};

export async function sendSms({ to, body }: SmsParams) {
  const client = getClient();
  if (!client || !process.env.TWILIO_FROM_NUMBER) {
    console.log(`[sms-dev] To: ${to}`);
    console.log(`[sms-dev] Body: ${body}`);
    console.log("[sms-dev] ---");
    return;
  }
  await client.messages.create({
    to,
    from: process.env.TWILIO_FROM_NUMBER,
    body,
  });
}

// ─── Helper to render + send a template SMS ───────────────

async function sendTemplateSms(
  phone: string,
  type: MessageTemplateType,
  vars: Record<string, string>,
  providerId?: string,
) {
  let smsTemplate: string;
  if (providerId) {
    const tpl = await getTemplate(providerId, type);
    smsTemplate = tpl.smsBody;
  } else {
    smsTemplate = DEFAULT_TEMPLATES[type].smsBody;
  }
  const body = renderTemplate(smsTemplate, vars);
  await sendSms({ to: phone, body });
}

// ─── Booking confirmation SMS ─────────────────────────────

export async function sendBookingConfirmationSms(
  phone: string,
  vars: Record<string, string>,
  providerId?: string,
) {
  await sendTemplateSms(phone, "BOOKING_CONFIRMATION", vars, providerId);
}

// ─── Reminder SMS ─────────────────────────────────────────

export async function sendAppointmentReminderSms(
  phone: string,
  providerName: string,
  serviceName: string,
  dateTime: string,
  providerId?: string,
) {
  await sendTemplateSms(phone, "REMINDER", {
    providerName,
    serviceName,
    dateTime,
    clientName: "",
    clientEmail: "",
  }, providerId);
}

// ─── Cancellation SMS ─────────────────────────────────────

export async function sendCancellationSms(
  phone: string,
  providerName: string,
  serviceName: string,
  providerId?: string,
) {
  await sendTemplateSms(phone, "CANCELLATION", {
    providerName,
    serviceName,
    dateTime: "",
    clientName: "",
    clientEmail: "",
    cancelledBy: "",
  }, providerId);
}

// ─── Waitlist available SMS ───────────────────────────

export async function sendWaitlistAvailableSms(
  phone: string,
  vars: Record<string, string>,
  providerId?: string,
) {
  await sendTemplateSms(phone, "WAITLIST_AVAILABLE", vars, providerId);
}

// ─── Waitlist joined confirmation SMS ─────────────────────

export async function sendWaitlistJoinedSms(
  phone: string,
  vars: Record<string, string>,
  providerId?: string,
) {
  await sendTemplateSms(phone, "WAITLIST_JOINED", vars, providerId);
}

// ─── Balance request SMS ──────────────────────────────────

export async function sendBalanceRequestSms(
  phone: string,
  vars: Record<string, string>,
  providerId?: string,
) {
  await sendTemplateSms(phone, "BALANCE_REQUEST", vars, providerId);
}

// ─── Completion SMS ───────────────────────────────────────

export async function sendCompletionSms(
  phone: string,
  providerName: string,
  serviceName: string,
  providerId?: string,
) {
  await sendTemplateSms(phone, "COMPLETION", {
    providerName,
    serviceName,
    dateTime: "",
    clientName: "",
    clientEmail: "",
  }, providerId);
}
