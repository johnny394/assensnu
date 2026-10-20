"use client";

import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import { lastChancePrice } from "@/lib/last-chance";
import type { MenuItem, MenuOptions } from "@/lib/types";

// Vinduet, der kommer frem, når man trykker + på en ret med størrelser eller tilvalg
export function ChoiceSheet({ item, options, halfPrice, onAdd, onClose }: {
  item: MenuItem;
  options: MenuOptions;
  halfPrice?: boolean; // sidste chance: hele linjen til halv pris
  onAdd: (size: string | undefined, extras: string[]) => void;
  onClose: () => void;
}) {
  const sizes = options.sizes.length > 1 ? options.sizes : [];
  const [size, setSize] = useState(sizes[0]?.name);
  const [extras, setExtras] = useState<string[]>([]);

  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const full =
    item.price +
    (sizes.find((s) => s.name === size)?.extra ?? 0) +
    options.extras.filter((e) => extras.includes(e.name)).reduce((sum, e) => sum + e.price, 0);
  const price = halfPrice ? lastChancePrice(full) : full;
  const toggle = (name: string) => setExtras((all) => (all.includes(name) ? all.filter((x) => x !== name) : [...all, name]));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col border-t-[3px] border-double border-ink bg-paper sm:border-[3px]"
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-black leading-tight tracking-tight">{item.name}</h2>
            {item.description && <p className="mt-1 text-ink-soft">{item.description}</p>}
          </div>
          <button onClick={onClose} aria-label="Luk" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink text-2xl">
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4">
          {sizes.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ink-soft">Størrelse</legend>
              <div className="grid gap-2">
                {sizes.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSize(s.name)}
                    aria-pressed={size === s.name}
                    className={`flex items-center justify-between border-2 border-ink px-4 py-3.5 text-lg ${size === s.name ? "bg-ink font-bold text-paper" : ""}`}
                  >
                    <span>{s.name}</span>
                    <span className="tabular-nums">{kr(item.price + s.extra)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {options.extras.length > 0 && (
            <fieldset className={sizes.length ? "mt-6" : ""}>
              <legend className="mb-1 text-sm font-bold uppercase tracking-[0.12em] text-ink-soft">Ekstra på</legend>
              <ul>
                {options.extras.map((e) => (
                  <li key={e.name} className="border-b border-line last:border-b-0">
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1 text-lg">
                      <input type="checkbox" checked={extras.includes(e.name)} onChange={() => toggle(e.name)} className="h-6 w-6 shrink-0 accent-stamp" />
                      <span className="flex-1">{e.name}</span>
                      <span className="tabular-nums text-ink-soft">+{kr(e.price)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </div>

        <div className="border-t border-line px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <button onClick={() => onAdd(size, extras)} className="w-full bg-stamp px-5 py-4 text-xl font-bold text-white">
            Læg i kurven · {kr(price)}
            {halfPrice && <span className="font-normal"> (halv pris)</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
