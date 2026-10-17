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
        <section key={category.name} className="mt-7">
          <h3 className="px-1 font-display text-lg font-extrabold tracking-tight">{category.name}</h3>
          <ul className="mt-2 overflow-hidden rounded-3xl bg-surface">
            {category.items.map((item) => {
              const quantity = cart[item.id] ?? 0;
              return (
                <li key={item.id} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg font-bold ${item.soldOut ? "text-ink-soft line-through" : ""}`}>{item.name}</p>
                    {item.description && <p className="text-ink-soft">{item.description}</p>}
                    <p className="mt-0.5">{item.soldOut ? <span className="text-signal">Udsolgt i dag</span> : kr(item.price)}</p>
                  </div>
                  {canOrder && !item.soldOut &&
                    (quantity === 0 ? (
                      <button
                        onClick={() => change(item.id, 1)}
                        aria-label={`Læg ${item.name} i kurven`}
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-buoy text-2xl font-bold text-ink active:scale-95"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1 rounded-full bg-ink p-1 text-white">
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
            className="mx-auto flex max-w-2xl items-center justify-between rounded-2xl bg-ink px-5 py-4 text-lg font-bold text-white shadow-lg"
          >
            <span>
              Se kurven <span className="font-normal text-white/70">· {count} {count === 1 ? "ting" : "ting"}</span>
            </span>
            <span>{kr(total)}</span>
          </Link>
        </div>
      )}
    </>
  );
}
