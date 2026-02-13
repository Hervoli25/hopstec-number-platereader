import { storage } from "../storage";
import { sendSMS, sendWhatsApp, isTwilioConfigured } from "./twilio-service";

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const MAX_RETRIES = 3;
let intervalHandle: NodeJS.Timeout | null = null;

export async function processNotificationBatch(): Promise<number> {
  const pending = await storage.getPendingNotifications(20);
  let sent = 0;

  for (const notification of pending) {
    try {
      let externalId: string | null = null;

      if (notification.channel === "sms" || notification.channel === "both") {
        if (notification.customerPhone) {
          const result = await sendSMS(notification.customerPhone, notification.message);
          externalId = result?.sid || null;
        }
      }

      if (notification.channel === "whatsapp" || notification.channel === "both") {
        if (notification.customerPhone) {
          const result = await sendWhatsApp(notification.customerPhone, notification.message);
          externalId = externalId || result?.sid || null;
        }
      }

      await storage.updateNotificationStatus(
        notification.id,
        "sent",
        externalId || undefined
      );
      sent++;
    } catch (err: any) {
      const retryCount = (notification.retryCount || 0) + 1;
      const status = retryCount >= MAX_RETRIES ? "failed" : "pending";
      await storage.updateNotificationStatus(
        notification.id,
        status,
        undefined,
        err.message || "Unknown error"
      );
    }
  }
  return sent;
}

export function startNotificationProcessor() {
  if (intervalHandle) return;
  if (!isTwilioConfigured()) {
    console.log("Twilio not configured — notification processor disabled");
    return;
  }
  console.log("Notification processor started (polling every 10s)");
  intervalHandle = setInterval(processNotificationBatch, POLL_INTERVAL_MS);
}

export function stopNotificationProcessor() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
