"use client";

import { kr } from "@/lib/format";
import { lastChancePrice } from "@/lib/last-chance";
import { clockTime } from "@/lib/live";
import { hasOptions } from "@/lib/menu-options";
import type { Place } from "@/lib/types";
import { useCart } from "./useCart";

// Sidste chance på stedets side: det, der er tilbage, til halv pris indtil lukketid
export function LastChanceOffer({ place }: { place: Place }) {
  const { cart, change } = useCart(place.slug);
  const chance = place.lastChance;
  if (!chance) return null;
  const items = place.menu.flatMap((c) => c.items.filter((i) => chance.itemIds.includes(i.id) && !i.soldOut).map((i) => ({ item: i, options: hasOptions(c.options) })));
  if (items.length === 0) return null;

  return (
    <section id="sidste-chance" className="mt-6 scroll-mt-24 border-[3px] border-stamp bg-paper px-4 pb-3 pt-3">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="stamp border-[2.5px] border-stamp px-2 py-0.5 text-base font-black uppercase tracking-[0.15em] text-stamp" style={{ "--tilt": "-2deg" } as React.CSSProperties}>
          Sidste chance
        </span>
        <span className="text-lg font-bold">Halv pris til kl. {clockTime(chance.until)}</span>
      </p>
      <p className="mt-2 text-ink-soft">Det, køkkenet har tilbage i dag. Så bliver det spist i stedet for smidt ud.</p>
      <ul className="mt-2">
        {items.map(({ item, options }) => {
          const quantity = cart[item.id] ?? 0;
          return (
            <li key={item.id} className="flex items-center gap-3 border-t border-line py-2.5">
              <span className="min-w-0 flex-1 text-lg">
                <span className="font-display text-xl font-semibold">{item.name}</span>
                <span className="block tabular-nums">
                  <s className="text-ink-soft">{kr(item.price)}</s> <strong className="text-stamp">{kr(lastChancePrice(item.price))}</strong>
                </span>
              </span>
              {!place.acceptsOrders ? null : options ? (
                <a href={`#ret-${item.id}`} className="shrink-0 border-2 border-ink px-3 py-2 text-lg font-bold">
                  Vælg ›
                </a>
              ) : (
                <button onClick={() => change(item.id, 1)} aria-label={`Læg ${item.name} i kurven`} className="min-h-12 shrink-0 bg-stamp px-4 text-lg font-bold text-white active:scale-95">
                  {quantity ? `${quantity} i kurven +` : "Læg i kurven"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
