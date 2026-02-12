import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const reminderQueue = new Queue("reminders", { connection });
export const followupQueue = new Queue("followups", { connection });
export const exportQueue = new Queue("exports", { connection });
export const cleanupQueue = new Queue("cleanup", { connection });

export { connection, Worker };
