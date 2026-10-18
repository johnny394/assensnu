"use client";

import Link from "next/link";
import { kr } from "@/lib/format";
import type { Place } from "@/lib/types";
import { useCart } from "./useCart";

// Menukortet. Hvis stedet tager imod bestillinger, kan man lægge retter i kurven.
export function Menu({ place }: { place: Place }) {
  const { cart, change } = useCart(place.slug);
  const items = place.menu.flatMap((c) => c.items);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = items.reduce((sum, i) => sum + (cart[i.id] ?? 0) * i.price, 0);
  const canOrder = place.acceptsOrders;

  return (
    <>
      {place.menu.map((category) => (
        <section key={category.name} className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink-soft">{category.name}</h3>
          <ul className="mt-1">
            {category.items.map((item) => {
              const quantity = cart[item.id] ?? 0;
              return (
                <li key={item.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    {/* Prisliste som på et menukort: navn, prikker og pris på samme linje */}
                    <p className="flex items-baseline gap-2">
                      <span className={`font-display text-xl font-semibold ${item.soldOut ? "text-ink-soft line-through" : ""}`}>{item.name}</span>
                      <span className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-ink-soft/60" aria-hidden />
                      {item.soldOut ? (
                        <span className="whitespace-nowrap font-bold text-stamp">Udsolgt i dag</span>
                      ) : (
                        <span className="whitespace-nowrap font-bold tabular-nums">{kr(item.price)}</span>
                      )}
                    </p>
                    {item.description && <p className="text-ink-soft">{item.description}</p>}
                  </div>
                  {canOrder && !item.soldOut &&
                    (quantity === 0 ? (
                      <button
                        onClick={() => change(item.id, 1)}
                        aria-label={`Læg ${item.name} i kurven`}
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink text-2xl font-bold text-ink active:scale-95"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1 rounded-full bg-stamp p-1 text-white">
                        <button onClick={() => change(item.id, -1)} aria-label={`Fjern en ${item.name}`} className="grid h-10 w-10 place-items-center rounded-full text-2xl">
                          −
                        </button>
                        <span className="w-6 text-center text-lg font-bold" aria-live="polite">{quantity}</span>
                        <button onClick={() => change(item.id, 1)} aria-label={`Læg en ${item.name} mere i kurven`} className="grid h-10 w-10 place-items-center rounded-full text-2xl">
                          +
                        </button>
                      </div>
                    ))}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {canOrder && count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 px-4">
          <Link
            href={`/sted/${place.slug}/bestil`}
            className="mx-auto flex max-w-2xl items-center justify-between bg-stamp px-5 py-4 text-lg text-white shadow-lg"
          >
            <span>
              {count} {count === 1 ? "vare" : "varer"} · {kr(total)}
            </span>
            <span className="font-bold">Se kurven ›</span>
          </Link>
        </div>
      )}
    </>
  );
}
