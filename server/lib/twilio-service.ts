import Twilio from "twilio";

// Lazily initialize so missing env vars don't crash the app at startup
let client: Twilio.Twilio | null = null;

function getClient(): Twilio.Twilio | null {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  client = new Twilio.Twilio(sid, token);
  return client;
}

export function isTwilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export async function sendSMS(to: string, body: string): Promise<{ sid: string } | null> {
  const c = getClient();
  if (!c) return null;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) return null;
  const msg = await c.messages.create({ to, from, body });
  return { sid: msg.sid };
}

export async function sendWhatsApp(to: string, body: string): Promise<{ sid: string } | null> {
  const c = getClient();
  if (!c) return null;
  const from = process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  const msg = await c.messages.create({
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    body,
  });
  return { sid: msg.sid };
}
