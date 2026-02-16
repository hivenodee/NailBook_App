import { Queue } from "bullmq";
import IORedis from "ioredis";
import { REMINDER_HOURS } from "@nailbook/shared";

// Lazy-init BullMQ connection — no-op when REDIS_URL not set
let _connection: IORedis | null = null;
let _reminderQueue: Queue | null = null;
let _followupQueue: Queue | null = null;

function getConnection(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return _connection;
}

function getReminderQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!_reminderQueue) {
    _reminderQueue = new Queue("reminders", { connection: conn });
  }
  return _reminderQueue;
}

function getFollowupQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!_followupQueue) {
    _followupQueue = new Queue("followups", { connection: conn });
  }
  return _followupQueue;
}

/**
 * Schedule 24h and 2h reminder jobs for a confirmed appointment.
 * No-op when Redis is not configured.
 */
export async function scheduleReminders(appointmentId: string, startTime: Date) {
  const queue = getReminderQueue();
  if (!queue) {
    console.log(`[jobs-dev] Would schedule reminders for appointment ${appointmentId}`);
    return;
  }

  const now = Date.now();

  // 24h reminder
  const delay24h = startTime.getTime() - REMINDER_HOURS.FIRST * 60 * 60 * 1000 - now;
  if (delay24h > 0) {
    await queue.add(
      `reminder-24h-${appointmentId}`,
      { appointmentId, type: "24h" },
      { delay: delay24h, jobId: `reminder-24h-${appointmentId}` }
    );
    console.log(`[jobs] Scheduled 24h reminder for appointment ${appointmentId}`);
  }

  // 2h reminder
  const delay2h = startTime.getTime() - REMINDER_HOURS.SECOND * 60 * 60 * 1000 - now;
  if (delay2h > 0) {
    await queue.add(
      `reminder-2h-${appointmentId}`,
      { appointmentId, type: "2h" },
      { delay: delay2h, jobId: `reminder-2h-${appointmentId}` }
    );
    console.log(`[jobs] Scheduled 2h reminder for appointment ${appointmentId}`);
  }
}

/**
 * Remove scheduled reminder jobs for a cancelled appointment.
 * No-op when Redis is not configured.
 */
export async function cancelReminders(appointmentId: string) {
  const queue = getReminderQueue();
  if (!queue) return;

  try {
    const job24 = await queue.getJob(`reminder-24h-${appointmentId}`);
    if (job24) await job24.remove();
    const job2 = await queue.getJob(`reminder-2h-${appointmentId}`);
    if (job2) await job2.remove();
    console.log(`[jobs] Cancelled reminders for appointment ${appointmentId}`);
  } catch (e) {
    console.error(`[jobs] Failed to cancel reminders for ${appointmentId}:`, e);
  }
}

/**
 * Schedule a follow-up / thank-you email 2 hours after completion.
 * No-op when Redis is not configured.
 */
export async function scheduleFollowup(appointmentId: string) {
  const queue = getFollowupQueue();
  if (!queue) {
    console.log(`[jobs-dev] Would schedule followup for appointment ${appointmentId}`);
    return;
  }

  const delay = 2 * 60 * 60 * 1000; // 2 hours after marking complete
  await queue.add(
    `followup-${appointmentId}`,
    { appointmentId },
    { delay, jobId: `followup-${appointmentId}` }
  );
  console.log(`[jobs] Scheduled followup for appointment ${appointmentId}`);
}
