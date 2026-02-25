import crypto from "crypto";
import { storage } from "../storage";

const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL;
const CRM_WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET;
const WEBHOOKS_ENABLED = process.env.DISABLE_WEBHOOKS !== "true";

/** Whether webhooks are configured and enabled */
export function isWebhookConfigured(): boolean {
  return WEBHOOKS_ENABLED && !!CRM_WEBHOOK_URL;
}

/** Compute HMAC-SHA256 signature for the payload */
function signPayload(body: string): string {
  const secret = CRM_WEBHOOK_SECRET || "";
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/** Calculate next retry delay using exponential backoff (in ms) */
export function getRetryDelay(attempt: number): number {
  // 10s, 30s, 90s, 270s (~4.5m), 810s (~13.5m), 2430s (~40m), ...
  const baseMs = 10_000;
  const delay = baseMs * Math.pow(3, attempt);
  // Cap at 1 hour
  return Math.min(delay, 3_600_000);
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  tenantId?: string;
  data: Record<string, unknown>;
}

/**
 * Fire a webhook to the configured CRM endpoint.
 * If it fails, queue for retry with exponential backoff.
 * This function never throws — failures are silently queued.
 */
export async function fireWebhook(
  event: string,
  data: Record<string, unknown>,
  tenantId = "default"
): Promise<void> {
  if (!isWebhookConfigured()) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    tenantId,
    data,
  };

  const bodyStr = JSON.stringify(payload);

  try {
    const signature = signPayload(bodyStr);
    const response = await fetch(CRM_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
      },
      body: bodyStr,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Success — no retry needed
  } catch (err: any) {
    // Queue for retry
    const nextRetryAt = new Date(Date.now() + getRetryDelay(0));
    try {
      await storage.createWebhookRetry({
        tenantId,
        targetUrl: CRM_WEBHOOK_URL!,
        payloadJson: payload,
        attempts: 1,
        lastError: err.message || "Unknown error",
        nextRetryAt,
      });
    } catch (dbErr) {
      console.error("Failed to queue webhook retry:", dbErr);
    }
  }
}

/**
 * Attempt to deliver a single queued webhook retry.
 * Returns true if successful, false if it needs to be retried again.
 */
export async function retryWebhook(retryId: string, targetUrl: string, payloadJson: any, attempts: number): Promise<boolean> {
  const bodyStr = JSON.stringify(payloadJson);
  const signature = signPayload(bodyStr);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": payloadJson.event || "retry",
        "X-Webhook-Retry": String(attempts),
      },
      body: bodyStr,
      signal: AbortSignal.timeout(15_000), // 15s for retries
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Success — delete from queue
    await storage.deleteWebhookRetry(retryId);
    return true;
  } catch (err: any) {
    const newAttempts = attempts + 1;
    const MAX_ATTEMPTS = 10;

    if (newAttempts >= MAX_ATTEMPTS) {
      // Give up — mark final error but keep record for audit
      await storage.updateWebhookRetry(retryId, {
        attempts: newAttempts,
        lastError: `FINAL FAILURE after ${MAX_ATTEMPTS} attempts: ${err.message}`,
        nextRetryAt: null, // No more retries
      });
    } else {
      const nextRetryAt = new Date(Date.now() + getRetryDelay(newAttempts));
      await storage.updateWebhookRetry(retryId, {
        attempts: newAttempts,
        lastError: err.message || "Unknown error",
        nextRetryAt,
      });
    }
    return false;
  }
}

