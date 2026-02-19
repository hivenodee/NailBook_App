import Expo, {
  type ExpoPushMessage,
  type ExpoPushTicket,
  type ExpoPushReceiptId,
  type ExpoPushReceipt,
} from "expo-server-sdk";

// ─── Expo push client (lazy init) ─────────────────────────

let _client: Expo | null = null;

function getClient(): Expo | null {
  // Expo push doesn't require an API key for basic usage,
  // but we check for an optional access token
  if (!_client) {
    _client = new Expo({
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
        : {}),
    });
  }
  return _client;
}

// ─── Send push notifications ─────────────────────────────

export type PushResult = {
  tickets: ExpoPushTicket[];
  ticketIds: string[];
};

/**
 * Send push notifications to one or more Expo push tokens.
 * Returns ticket IDs for receipt checking.
 * Graceful fallback: logs to console when client isn't available.
 */
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<PushResult> {
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));

  if (validTokens.length === 0) {
    console.log(`[push-dev] No valid Expo push tokens provided`);
    return { tickets: [], ticketIds: [] };
  }

  const client = getClient();
  if (!client) {
    console.log(`[push-dev] To: ${validTokens.join(", ")}`);
    console.log(`[push-dev] Title: ${title}`);
    console.log(`[push-dev] Body: ${body}`);
    console.log("[push-dev] ---");
    return { tickets: [], ticketIds: [] };
  }

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    title,
    body,
    sound: "default" as const,
    ...(data ? { data } : {}),
  }));

  // Chunk messages to respect Expo limits
  const chunks = client.chunkPushNotifications(messages);
  const allTickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const tickets = await client.sendPushNotificationsAsync(chunk);
      allTickets.push(...tickets);
    } catch (e) {
      console.error("[push] Failed to send chunk:", e);
    }
  }

  // Extract ticket IDs from successful tickets
  const ticketIds = allTickets
    .filter((t): t is { status: "ok"; id: string } => t.status === "ok")
    .map((t) => t.id);

  return { tickets: allTickets, ticketIds };
}

// ─── Check push receipts ─────────────────────────────────

/**
 * Check delivery receipts for previously sent push notifications.
 */
export async function checkPushReceipts(
  receiptIds: ExpoPushReceiptId[]
): Promise<Record<string, ExpoPushReceipt>> {
  const client = getClient();
  if (!client || receiptIds.length === 0) {
    return {};
  }

  const chunks = client.chunkPushNotificationReceiptIds(receiptIds);
  const allReceipts: Record<string, ExpoPushReceipt> = {};

  for (const chunk of chunks) {
    try {
      const receipts = await client.getPushNotificationReceiptsAsync(chunk);
      Object.assign(allReceipts, receipts);
    } catch (e) {
      console.error("[push] Failed to check receipts:", e);
    }
  }

  return allReceipts;
}
