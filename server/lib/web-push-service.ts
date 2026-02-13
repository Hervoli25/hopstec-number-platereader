import webpush from "web-push";
import { storage } from "../storage";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@hopsvoir.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isWebPushConfigured(): boolean {
  return ensureConfigured();
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

async function sendPush(subscription: { endpoint: string; p256dh: string; auth: string; id: string }, payload: PushPayload): Promise<boolean> {
  if (!ensureConfigured()) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    // 410 Gone or 404 = subscription expired, remove it
    if (err.statusCode === 410 || err.statusCode === 404) {
      await storage.deletePushSubscription(subscription.id);
    }
    return false;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const subscriptions = await storage.getPushSubscriptionsByUser(userId);
  let sent = 0;
  for (const sub of subscriptions) {
    const ok = await sendPush(sub, payload);
    if (ok) sent++;
  }
  return sent;
}

export async function sendPushToCustomer(customerToken: string, payload: PushPayload): Promise<number> {
  const subscriptions = await storage.getPushSubscriptionsByCustomerToken(customerToken);
  let sent = 0;
  for (const sub of subscriptions) {
    const ok = await sendPush(sub, payload);
    if (ok) sent++;
  }
  return sent;
}

export async function sendPushToAllManagers(payload: PushPayload): Promise<number> {
  const subscriptions = await storage.getPushSubscriptionsByRole("manager");
  let sent = 0;
  for (const sub of subscriptions) {
    const ok = await sendPush(sub, payload);
    if (ok) sent++;
  }
  return sent;
}
