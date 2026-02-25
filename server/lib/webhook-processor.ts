import { storage } from "../storage";
import { retryWebhook, isWebhookConfigured } from "./webhook-service";

const POLL_INTERVAL_MS = 30_000; // 30 seconds
let intervalHandle: NodeJS.Timeout | null = null;

/**
 * Process a batch of pending webhook retries.
 * Returns the number of successfully delivered webhooks.
 */
export async function processWebhookRetryBatch(): Promise<number> {
  try {
    const pending = await storage.getPendingWebhookRetries(10);
    let delivered = 0;

    for (const entry of pending) {
      const ok = await retryWebhook(
        entry.id,
        entry.targetUrl,
        entry.payloadJson,
        entry.attempts ?? 0
      );
      if (ok) delivered++;
    }

    return delivered;
  } catch (err) {
    console.error("Webhook retry processor error:", err);
    return 0;
  }
}

/**
 * Start the webhook retry processor (background poller).
 * Only starts if CRM_WEBHOOK_URL is configured.
 */
export function startWebhookProcessor() {
  if (intervalHandle) return;
  if (!isWebhookConfigured()) {
    console.log("CRM_WEBHOOK_URL not configured — webhook processor disabled");
    return;
  }
  console.log("Webhook retry processor started (polling every 30s)");
  intervalHandle = setInterval(processWebhookRetryBatch, POLL_INTERVAL_MS);
}

/**
 * Stop the webhook retry processor.
 */
export function stopWebhookProcessor() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

