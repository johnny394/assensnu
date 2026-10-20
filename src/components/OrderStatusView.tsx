"use client";

import { useEffect, useRef } from "react";
import { kr, telLink } from "@/lib/format";
import { choiceText } from "@/lib/menu-options";
import { townName } from "@/lib/postcodes";
import type { Order } from "@/lib/types";
import { HomeScreenGuide, type PushFor } from "./HomeScreenGuide";
import { useNow } from "./useNow";
import { usePolling } from "./usePolling";

const NO_ANSWER_MINUTES = 5;

export function OrderStatusView({ initial, placePhone, pushKey }: { initial: Order; placePhone?: string; pushKey: string | null }) {
  const order = usePolling<Order>(`/api/orders/${initial.id}`, initial);
  const now = useNow(15_000);
  const previous = useRef(order.status);
  const delivery = order.delivery;

  // Giv besked, når maden er klar
  useEffect(() => {
    if (previous.current !== "ready" && order.status === "ready") {
      navigator.vibrate?.([300, 100, 300]);
      if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker?.getRegistration().then((reg) => {
          const title = `${order.placeName}: ${delivery ? "maden er på vej" : "maden er klar"}`;
          const text = { body: delivery ? `Ordre ${order.number} kører ud til dig nu.` : `Ordre ${order.number} kan hentes nu.`, icon: "/icon-192.png", tag: `order-${order.id}` };
          if (reg) reg.showNotification(title, text);
          else new Notification(title, text);
        });
      }
    }
    previous.current = order.status;
  }, [order.status, order.number, order.placeName, order.id, delivery]);

  const waitedMinutes = now ? (now.getTime() - Date.parse(order.createdAt)) / 60000 : 0;
  const noAnswer = order.status === "new" && waitedMinutes > NO_ANSWER_MINUTES;
  const pickupText = order.pickup === "asap" ? "hurtigst muligt" : `kl. ${order.pickup}`;

  const steps = [
    { done: true, text: "Sendt til restauranten" },
    { done: ["accepted", "ready", "picked_up"].includes(order.status), text: order.readyAt ? `Modtaget. Klar ca. kl. ${order.readyAt}` : "Restauranten har set den" },
    { done: ["ready", "picked_up"].includes(order.status), text: delivery ? "Maden kører ud til dig" : "Klar til afhentning" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-y-[3px] border-double border-ink px-1 py-6">
        <p className="text-lg text-ink-soft">Ordre</p>
        <p className="font-display text-6xl font-black tracking-tight tabular-nums">{order.number}</p>
        <p className="mt-1 text-lg">
          {delivery ? `${order.placeName} kører maden ud til ${delivery.address}, ${townName(delivery.postcode)}.` : `Sig nummeret, når du henter hos ${order.placeName}.`}
        </p>

        {(order.status === "new" || order.status === "accepted") && (
          <div className="mt-5">
            <HomeScreenGuide
              title={delivery ? "Få besked, når maden kører" : "Få besked, når maden er klar"}
              text={delivery ? "Så kan du lægge telefonen væk, til den bipper." : "Så kan du lægge telefonen væk og gå, når den bipper."}
              push={{ kind: "order", id: order.id, publicKey: pushKey } satisfies PushFor}
            />
          </div>
        )}

        {order.status === "rejected" ? (
          <div className="mt-5 bg-stamp-soft px-4 py-4 text-lg text-stamp">
            <p className="font-bold">{order.placeName} kan desværre ikke lave din bestilling.</p>
            {placePhone && <p>Ring til dem, hvis du vil høre hvorfor.</p>}
          </div>
        ) : order.status === "ready" || order.status === "picked_up" ? (
          <div className="mt-5 bg-stamp-soft px-4 py-5">
            <p style={{ "--tilt": "-3deg" } as React.CSSProperties} className="stamp stamp-in inline-block border-[3px] border-stamp px-3 py-1 font-display text-2xl font-black tracking-wide text-stamp">
              {delivery ? (order.status === "picked_up" ? "Maden er leveret" : "Maden er på vej!") : "Maden er klar!"}
            </p>
            <p className="mt-3 text-lg">{delivery ? `${order.placeName} kører ud til ${delivery.address}.` : `Hent den hos ${order.placeName}.`}</p>
          </div>
        ) : (
          <ol className="mt-5 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-lg">
                <span className={`grid h-7 w-7 shrink-0 place-items-center border-2 ${s.done ? "border-ink bg-ink text-paper" : "border-ink-soft/50 text-transparent"}`} aria-hidden>
                  ✓
                </span>
                <span className={s.done ? "" : "text-ink-soft"}>{s.text}</span>
              </li>
            ))}
          </ol>
        )}

        {noAnswer && placePhone && (
          <div className="mt-5 bg-stamp-soft px-4 py-4 text-lg">
            <p className="font-bold text-stamp">Restauranten har ikke svaret endnu.</p>
            <p>Ring og sig, at du har bestilt gennem AssensNu.</p>
            <a href={telLink(placePhone)} className="mt-3 block bg-ink px-5 py-3.5 text-center font-bold text-paper">
              Ring {placePhone}
            </a>
          </div>
        )}
      </div>

      <div className="border-2 border-ink bg-surface px-5 py-4 text-lg">
        <p className="font-bold">Du har bestilt</p>
        <ul className="mt-2 space-y-1">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {l.person && l.person !== order.lines[i - 1]?.person && <span className="block font-bold">{l.person}</span>}
                {l.quantity} × {l.name}
                {choiceText(l) && <span className="block text-ink-soft">{choiceText(l)}</span>}
              </span>
              <span className="tabular-nums">{kr(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        {delivery && (
          <p className="flex justify-between">
            <span>Levering</span>
            <span className="tabular-nums">{kr(delivery.fee)}</span>
          </p>
        )}
        <p className="mt-2 flex justify-between border-t border-line pt-2 font-bold">
          <span>{delivery ? "Betales, når maden kommer" : "Betales ved afhentning"}</span>
          <span className="tabular-nums">{kr(order.total)}</span>
        </p>
        <p className="mt-2 text-ink-soft">
          {delivery ? `Levering ${pickupText}` : `Afhentning ${pickupText}`} · {order.customerName}, {order.customerPhone}
        </p>
        {order.note && <p className="text-ink-soft">Besked: {order.note}</p>}
      </div>
    </div>
  );
}
