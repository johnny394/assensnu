"use client";

import { kr } from "@/lib/format";
import type { MenuItem } from "@/lib/types";
import { useLang } from "./useLang";
import { useCart } from "./useCart";

// "Ja tak" ved dagens tilbud. Kurven og kassen er de samme som for resten af menukortet.
export function TodaysDishButton({ slug, dish }: { slug: string; dish: MenuItem }) {
  const { cart, change } = useCart(slug);
  const quantity = cart[dish.id] ?? 0;
  const { t } = useLang();

  if (quantity === 0) {
    return (
      <button onClick={() => change(dish.id, 1)} className="mt-3 flex min-h-14 w-full items-center justify-between border-2 border-ink bg-stamp px-4 text-lg text-white active:scale-[0.99]">
        <span className="font-black">{t("Ja tak! Læg i kurven")}</span>
        <span className="tabular-nums">{kr(dish.price)}</span>
      </button>
    );
  }
  return (
    <div className="mt-3 flex min-h-14 items-center justify-between gap-3">
      <span className="text-lg font-black">{t("✓ {n} i kurven", { n: quantity })}</span>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-stamp p-1 text-white">
        <button onClick={() => change(dish.id, -1)} aria-label={t("Fjern en")} className="grid h-10 w-10 place-items-center rounded-full text-2xl">
          −
        </button>
        <span className="w-6 text-center text-lg font-bold" aria-live="polite">{quantity}</span>
        <button onClick={() => change(dish.id, 1)} aria-label={t("Læg en mere i kurven")} className="grid h-10 w-10 place-items-center rounded-full text-2xl">
          +
        </button>
      </div>
    </div>
  );
}
