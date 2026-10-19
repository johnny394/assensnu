import "server-only";
import webpush from "web-push";
import { store } from "./store";
import type { PushSubscription, PushTarget } from "./store/types";

// Beskeder til kundens telefon, også når AssensNu er lukket eller telefonen er låst.
// Kræver VAPID_PUBLIC_KEY og VAPID_PRIVATE_KEY på Vercel. Mangler de, sendes intet,
// og bekræftelsessiden giver stadig besked, mens den er åben.

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY?.trim() || null;

let ready = false;
function setup() {
  const publicKey = pushPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  if (!ready) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:kontakt@assensnu.dk", publicKey, privateKey);
    ready = true;
  }
  return true;
}

export function cleanSubscription(input: unknown): PushSubscription | null {
  const s = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = s?.endpoint;
  const p256dh = s?.keys?.p256dh;
  const auth = s?.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 1000 || !endpoint.startsWith("https://")) return null;
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint, keys: { p256dh, auth } };
}

export type PushMessage = { title: string; body: string; url: string };

export async function notify(target: PushTarget, message: PushMessage) {
  if (!setup()) return;
  try {
    const subscription = await store.getPush(target);
    if (!subscription) return;
    const tag = `${target.kind}-${target.id}`;
    await webpush.sendNotification(subscription, JSON.stringify({ ...message, tag }), { TTL: 3600, urgency: "high" });
  } catch (e) {
    // Telefonen har sagt nej tak eller er nulstillet: glem den
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await store.savePush(target, null).catch(() => {});
    else console.error("Push-besked kunne ikke sendes", e);
  }
}
