"use client";

// Telefonens adresse til beskeder fra AssensNu. Den samme bruges til ordrer, borde og steder, man følger.
export async function phoneSubscription(publicKey: string): Promise<PushSubscriptionJSON | "unsupported" | "failed"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.ready;
    const key = base64UrlToBytes(publicKey);
    let subscription = await reg.pushManager.getSubscription();
    // En gammel tilmelding med en anden nøgle virker ikke længere
    const oldKey = subscription?.options.applicationServerKey;
    if (subscription && oldKey && !sameBytes(new Uint8Array(oldKey), key)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    return subscription.toJSON();
  } catch {
    return "failed";
  }
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

function base64UrlToBytes(value: string) {
  const raw = atob((value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
