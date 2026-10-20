"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export type PushFor = { kind: "order" | "booking"; id: string; publicKey: string | null };

// Melder telefonen til beskeder om netop denne bestilling, så de kommer, selv om siden er lukket
async function subscribe(push: PushFor) {
  if (!push.publicKey || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(push.publicKey) }));
    await fetch("/api/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: push.kind, id: push.id, subscription }),
    });
  } catch {
    // Så får de stadig besked, mens siden er åben
  }
}

function base64UrlToBytes(value: string) {
  const raw = atob((value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Beder folk lægge AssensNu på hjemmeskærmen, så de kan få besked, når maden er klar.
// På iPhone virker beskeder fra en hjemmeside kun derfra.
export function HomeScreenGuide({ reason, push }: { reason: string; push?: PushFor }) {
  const [platform, setPlatform] = useState<"ios" | "other" | "installed" | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [notify, setNotify] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setPlatform(standalone ? "installed" : ios ? "ios" : "other");
    if ("Notification" in window) setNotify(Notification.permission);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const pushKind = push?.kind;
  const pushId = push?.id;
  const pushKey = push?.publicKey ?? null;
  useEffect(() => {
    if (notify === "granted" && pushKind && pushId) subscribe({ kind: pushKind, id: pushId, publicKey: pushKey });
  }, [notify, pushKind, pushId, pushKey]);

  if (!platform) return null;

  const askNotify =
    notify === "default" ? (
      <button onClick={async () => setNotify(await Notification.requestPermission())} className="mt-3 w-full bg-ink px-5 py-3.5 text-lg font-bold text-paper">
        Ja tak, giv mig besked
      </button>
    ) : notify === "granted" ? (
      <p className="mt-2 font-bold text-go">Du får besked på denne telefon.</p>
    ) : null;

  if (platform === "installed") {
    return askNotify ? <div className="border-2 border-ink bg-surface px-5 py-5 text-lg"><p>{reason}</p>{askNotify}</div> : null;
  }

  return (
    <div className="border-2 border-ink bg-surface px-5 py-5 text-lg">
      <p className="font-display text-xl font-black tracking-tight">Læg AssensNu på din hjemmeskærm</p>
      <p className="mt-1">{reason} Så ligger AssensNu også klar, næste gang du er sulten.</p>
      {platform === "ios" ? (
        <ol className="mt-4 space-y-3">
          <li className="flex items-center gap-3">
            <Step n={1} />
            <span>
              Tryk på <strong>Del</strong>-knappen
              <svg viewBox="0 0 24 24" className="mx-1 inline h-6 w-6 align-[-5px] text-stamp" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Del-knappen">
                <path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" />
              </svg>
              nederst i Safari
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Step n={2} />
            <span>
              Vælg <strong>Føj til hjemmeskærm</strong>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Step n={3} />
            <span>
              Tryk <strong>Tilføj</strong> øverst til højre
            </span>
          </li>
        </ol>
      ) : installPrompt ? (
        <button onClick={() => installPrompt.prompt()} className="mt-3 w-full bg-ink px-5 py-3.5 text-lg font-bold text-paper">
          Læg på hjemmeskærmen
        </button>
      ) : (
        <p className="mt-2 text-ink-soft">Åbn browserens menu (de tre prikker) og vælg &quot;Føj til startskærm&quot;.</p>
      )}
      {platform === "other" && askNotify}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-bold text-white">{n}</span>;
}
