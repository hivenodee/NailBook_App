import { ServerClient } from "postmark";

let _client: ServerClient | null = null;

function getClient(): ServerClient {
  if (!_client) {
    _client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
  }
  return _client;
}

type SendEmailParams = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
};

export async function sendEmail({ to, subject, htmlBody, textBody }: SendEmailParams) {
  return getClient().sendEmail({
    From: "bookings@nailbook.com",
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
  });
}

export async function sendBookingConfirmation(
  to: string,
  providerName: string,
  serviceName: string,
  dateTime: string,
  depositAmount: string | null
) {
  const depositLine = depositAmount
    ? `<p>Deposit paid: ${depositAmount}</p>`
    : "";

  return sendEmail({
    to,
    subject: `Booking Confirmed — ${providerName}`,
    htmlBody: `
      <h2>You're booked!</h2>
      <p><strong>${serviceName}</strong> with ${providerName}</p>
      <p>${dateTime}</p>
      ${depositLine}
      <p>See you there!</p>
    `,
  });
}

export async function sendAppointmentReminder(
  to: string,
  providerName: string,
  serviceName: string,
  dateTime: string,
  hoursUntil: number
) {
  return sendEmail({
    to,
    subject: `Reminder: ${serviceName} in ${hoursUntil}h`,
    htmlBody: `
      <h2>Appointment Reminder</h2>
      <p><strong>${serviceName}</strong> with ${providerName}</p>
      <p>${dateTime}</p>
    `,
  });
}
