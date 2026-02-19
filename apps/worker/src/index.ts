import { startReminderWorker } from "./jobs/reminders";
import { startFollowupWorker } from "./jobs/followups";
import { startExportWorker } from "./jobs/exports";
import { startCleanupWorker } from "./jobs/cleanup";
import { startPushReceiptWorker } from "./jobs/push-receipts";
import { startNotificationRetryWorker } from "./jobs/notification-retry";
import { cleanupQueue, pushReceiptQueue, notificationRetryQueue } from "./queue";

async function main() {
  console.log("Starting NailBook worker...");

  // Start all job workers
  const reminderWorker = startReminderWorker();
  const followupWorker = startFollowupWorker();
  const exportWorker = startExportWorker();
  const cleanupWorker = startCleanupWorker();
  const pushReceiptWorker = startPushReceiptWorker();
  const notificationRetryWorker = startNotificationRetryWorker();

  // Schedule cleanup job to run every 15 minutes
  await cleanupQueue.add(
    "cleanup-drafts",
    {},
    {
      repeat: { every: 15 * 60 * 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  // Schedule push receipt checking every 5 minutes
  await pushReceiptQueue.add(
    "check-push-receipts",
    {},
    {
      repeat: { every: 5 * 60 * 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  // Schedule notification retry every 15 minutes
  await notificationRetryQueue.add(
    "retry-failed-notifications",
    {},
    {
      repeat: { every: 15 * 60 * 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  console.log("All workers started successfully");
  console.log("  - Reminders worker");
  console.log("  - Follow-ups worker");
  console.log("  - Exports worker");
  console.log("  - Cleanup worker (every 15m)");
  console.log("  - Push receipt worker (every 5m)");
  console.log("  - Notification retry worker (every 15m)");

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down workers...");
    await Promise.all([
      reminderWorker.close(),
      followupWorker.close(),
      exportWorker.close(),
      cleanupWorker.close(),
      pushReceiptWorker.close(),
      notificationRetryWorker.close(),
    ]);
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
