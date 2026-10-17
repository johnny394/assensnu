"use client";

import { useEffect, useRef } from "react";
import { kr, telLink } from "@/lib/format";
import type { Order } from "@/lib/types";
import { HomeScreenGuide } from "./HomeScreenGuide";
import { useNow } from "./useNow";
import { usePolling } from "./usePolling";

const NO_ANSWER_MINUTES = 5;

export function OrderStatusView({ initial, placePhone }: { initial: Order; placePhone?: string }) {
  const order = usePolling<Order>(`/api/orders/${initial.id}`, initial);
  const now = useNow(15_000);
  const previous = useRef(order.status);

  // Giv besked, når maden er klar
  useEffect(() => {
    if (previous.current !== "ready" && order.status === "ready") {
      navigator.vibrate?.([300, 100, 300]);
      if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker?.getRegistration().then((reg) => {
          const text = { body: `Ordre ${order.number} kan hentes nu.`, icon: "/icon-192.png" };
          if (reg) reg.showNotification(`${order.placeName}: maden er klar`, text);
          else new Notification(`${order.placeName}: maden er klar`, text);
        });
      }
    }
    previous.current = order.status;
  }, [order.status, order.number, order.placeName]);

  const waitedMinutes = now ? (now.getTime() - Date.parse(order.createdAt)) / 60000 : 0;
  const noAnswer = order.status === "new" && waitedMinutes > NO_ANSWER_MINUTES;
  const pickupText = order.pickup === "asap" ? "hurtigst muligt" : `kl. ${order.pickup}`;

  const steps = [
    { done: true, text: "Sendt til restauranten" },
    { done: ["accepted", "ready", "picked_up"].includes(order.status), text: order.readyAt ? `Modtaget. Klar ca. kl. ${order.readyAt}` : "Restauranten har set den" },
    { done: ["ready", "picked_up"].includes(order.status), text: "Klar til afhentning" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[1.4rem] bg-surface shadow-card px-5 py-6">
        <p className="text-lg text-ink-soft">Ordre</p>
        <p className="font-display text-6xl font-extrabold tracking-tight tabular-nums">{order.number}</p>
        <p className="mt-1 text-lg">Sig nummeret, når du henter hos {order.placeName}.</p>

        {order.status === "rejected" ? (
          <div className="mt-5 rounded-2xl bg-signal-soft px-4 py-4 text-lg text-signal">
            <p className="font-bold">{order.placeName} kan desværre ikke lave din bestilling.</p>
            {placePhone && <p>Ring til dem, hvis du vil høre hvorfor.</p>}
          </div>
        ) : order.status === "ready" || order.status === "picked_up" ? (
          <div className="mt-5 rounded-2xl border-2 border-buoy-deep bg-buoy px-4 py-4 shadow-[0_0_24px_4px_rgba(255,200,69,0.45)]">
            <p className="font-display text-2xl font-extrabold tracking-tight">Maden er klar!</p>
            <p className="text-lg">Hent den hos {order.placeName}.</p>
          </div>
        ) : (
          <ol className="mt-5 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-lg">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${s.done ? "border-go bg-go text-white" : "border-line text-transparent"}`} aria-hidden>
                  ✓
                </span>
                <span className={s.done ? "" : "text-ink-soft"}>{s.text}</span>
              </li>
            ))}
          </ol>
        )}

        {noAnswer && placePhone && (
          <div className="mt-5 rounded-2xl bg-signal-soft px-4 py-4 text-lg">
            <p className="font-bold text-signal">Restauranten har ikke svaret endnu.</p>
            <p>Ring og sig, at du har bestilt gennem AssensNu.</p>
            <a href={telLink(placePhone)} className="mt-3 block rounded-2xl bg-ink px-5 py-3.5 text-center font-bold text-white">
              Ring {placePhone}
            </a>
          </div>
        )}
      </div>

      {order.status !== "rejected" && order.status !== "picked_up" && (
        <HomeScreenGuide reason="Vil du have besked, når maden er klar?" />
      )}

      <div className="rounded-[1.4rem] bg-surface shadow-card px-5 py-4 text-lg">
        <p className="font-bold">Du har bestilt</p>
        <ul className="mt-2 space-y-1">
          {order.lines.map((l) => (
            <li key={l.itemId} className="flex justify-between">
              <span>{l.quantity} × {l.name}</span>
              <span className="tabular-nums">{kr(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-line pt-2 font-bold">
          <span>Betales ved afhentning</span>
          <span className="tabular-nums">{kr(order.total)}</span>
        </p>
        <p className="mt-2 text-ink-soft">Afhentning {pickupText} · {order.customerName}, {order.customerPhone}</p>
        {order.note && <p className="text-ink-soft">Besked: {order.note}</p>}
      </div>
    </div>
  );
}
