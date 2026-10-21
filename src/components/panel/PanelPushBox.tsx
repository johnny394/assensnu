"use client";

import { useEffect, useState } from "react";
import { phoneSubscription } from "@/components/phone-push";

const KEY = "assensnu:panel-besked";

type State = "loading" | "off" | "on" | "working" | "ios" | "denied" | "failed";

// Restaurantens telefon bipper, hvis en ordre har ventet 3 minutter uden svar
export function PanelPushBox({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  useEffect(() => {
    let on = false;
    try {
      on = localStorage.getItem(KEY) === "1";
    } catch {}
    setState(on ? "on" : "off");
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);
  if (!publicKey || state === "loading") return null;

  async function send(stop: boolean) {
    const subscription = await phoneSubscription(publicKey!);
    if (typeof subscription === "string") return false;
    const res = await fetch("/api/panel/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription, stop }) }).catch(() => null);
    return !!res?.ok;
  }
  async function turnOn() {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) return setState("ios");
    if (!("Notification" in window)) return setState("failed");
    setState("working");
    if ((await Notification.requestPermission()) !== "granted") return setState("denied");
    if (!(await send(false))) return setState("failed");
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setState("on");
  }
  async function turnOff() {
    setState("working");
    await send(true);
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setState("off");
  }

  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Besked, hvis en ordre venter</p>
      <p className="text-ink-soft">Har ingen svaret på en ordre efter 3 minutter, bipper denne telefon. Også når skærmen er slukket.</p>
      {state === "on" ? (
        <p className="mt-3 flex items-center justify-between gap-3 text-lg">
          <span className="font-bold text-go">✓ Slået til på denne telefon</span>
          <button onClick={turnOff} className="text-ink-soft underline">Slå fra</button>
        </p>
      ) : (
        <button onClick={turnOn} disabled={state === "working"} className="mt-3 min-h-14 w-full rounded-2xl bg-buoy px-5 text-lg font-bold disabled:opacity-60">
          {state === "working" ? "Et øjeblik …" : "Slå til på denne telefon"}
        </button>
      )}
      {state === "ios" && <p className="mt-2 text-lg">På iPhone og iPad: tryk på Del-knappen i Safari, vælg &quot;Føj til hjemmeskærm&quot;, åbn AssensNu fra det nye ikon, gå til panelet, og tryk her igen.</p>}
      {state === "denied" && <p className="mt-2 font-bold text-signal">Telefonen har sagt nej til beskeder. Det kan ændres under telefonens indstillinger.</p>}
      {state === "failed" && <p className="mt-2 font-bold text-signal">Det lykkedes ikke på denne telefon. Prøv igen senere.</p>}
    </div>
  );
}
