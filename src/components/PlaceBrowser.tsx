"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { copenhagenNow, openStatus, pickupOptions } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { OpenSign } from "./OpenSign";
import { offerPrice } from "./TodaysOffer";
import { useNow } from "./useNow";

type Filter = "open" | "takeaway" | "dineIn";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Åben nu" },
  { key: "takeaway", label: "Takeaway" },
  { key: "dineIn", label: "Spis på stedet" },
];

const RANK = { open: 0, closed: 1, unknown: 2 } as const;

export function PlaceBrowser({ places, title }: { places: Place[]; title?: string }) {
  const now = useNow();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [cuisine, setCuisine] = useState<string | null>(null);

  const cuisines = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of places) for (const c of p.cuisines) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "da")).map(([c]) => c);
  }, [places]);

  const state = (p: Place) => (now ? openStatus(p, now).state : "unknown");
  const openCount = now ? places.filter((p) => p.member && state(p) === "open").length : null;

  const q = query.trim().toLowerCase();
  const visible = places
    .filter((p) => {
      if (q) {
        const words = [p.name, ...p.cuisines, ...p.menu.flatMap((c) => c.items.map((i) => i.name))].join(" ").toLowerCase();
        if (!words.includes(q)) return false;
      }
      if (cuisine && !p.cuisines.includes(cuisine)) return false;
      if (filters.has("takeaway") && !p.takeaway) return false;
      if (filters.has("dineIn") && !p.dineIn) return false;
      if (filters.has("open") && state(p) !== "open") return false;
      return true;
    })
    // Steder, der er med, først. Dem, der ikke er med endnu, står låst nederst.
    .sort((a, b) => Number(!a.member) - Number(!b.member) || RANK[state(a)] - RANK[state(b)] || a.name.localeCompare(b.name, "da"));

  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const chip = (on: boolean) =>
    `shrink-0 border-2 border-ink px-4 py-2 text-base transition-colors ${on ? "bg-ink font-bold text-paper" : "bg-transparent text-ink hover:bg-surface"}`;

  return (
    <div>
      <h1 className="font-display text-[2.6rem] font-black leading-[1.02] tracking-tight">{title ?? headline(now)}</h1>
      <p className="mt-2 min-h-7 text-lg text-ink-soft">{openCount !== null && openLine(openCount)}</p>

      <OfferStrip places={places.filter((p) => p.member && p.news)} />

      <label className="mt-5 flex items-center gap-3 border-b-2 border-ink px-1">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span className="sr-only">Søg</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg, fx pizza eller durum"
          className="w-full bg-transparent py-3 text-lg outline-none placeholder:text-ink-soft"
        />
      </label>

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => toggle(f.key)} aria-pressed={filters.has(f.key)} className={chip(filters.has(f.key))}>
            {f.label}
          </button>
        ))}
        {cuisines.map((c) => (
          <button key={c} onClick={() => setCuisine(cuisine === c ? null : c)} aria-pressed={cuisine === c} className={chip(cuisine === c)}>
            {c}
          </button>
        ))}
      </div>

      <ul className="mt-5 border-t-[3px] border-double border-ink">
        {visible.map((p, i) =>
          p.member ? (
            <li key={p.slug} className="border-b border-ink">
              <Link href={`/sted/${p.slug}`} className="group flex items-center justify-between gap-3 py-4 active:bg-surface">
                <div className="min-w-0">
                  <h2 className={`font-display text-[1.55rem] font-semibold leading-tight group-hover:underline ${state(p) === "open" ? "" : "text-ink-soft"}`}>
                    {p.name}
                  </h2>
                  <p className="mt-1 text-sm uppercase tracking-[0.1em] text-ink-soft">
                    {[...p.cuisines, p.takeaway && "Takeaway"].filter(Boolean).join(" · ")}
                    {p.acceptsOrders && <span className="font-bold text-stamp"> · Bestil her</span>}
                    {p.acceptsOrders && now && <WaitText place={p} now={now} />}
                  </p>
                  {p.news && (
                    <p className="mt-1 line-clamp-2 text-base">
                      <span className="mr-1.5 bg-buoy px-1.5 py-0.5 text-sm font-black uppercase tracking-[0.08em]">Tilbud</span>
                      {p.news.text}
                      {p.news.price && <span className="whitespace-nowrap font-bold text-stamp"> · {offerPrice(p.news.price)}</span>}
                    </p>
                  )}
                </div>
                <OpenSign place={p} now={now} tilt={TILTS[i % TILTS.length]} />
              </Link>
            </li>
          ) : (
            // Låst, til stedet har sagt ja til AssensNu. Kan ikke åbnes.
            <li key={p.slug} className="border-b border-ink">
              <div className="flex items-center justify-between gap-3 py-4" aria-label={`${p.name}, kommer snart`}>
                <div className="min-w-0 opacity-55">
                  <h2 className="font-display text-[1.55rem] font-semibold leading-tight text-ink-soft">{p.name}</h2>
                  <p className="mt-1 text-sm uppercase tracking-[0.1em] text-ink-soft">{p.cuisines.join(" · ")}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 border-2 border-dashed border-ink-soft px-2.5 py-1.5 text-sm font-bold uppercase leading-tight tracking-[0.08em] text-ink-soft">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <rect x="5" y="11" width="14" height="10" rx="1.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  Kommer snart
                </span>
              </div>
            </li>
          ),
        )}
        {visible.length === 0 && (
          <li className="border-b border-ink py-10 text-center text-lg text-ink-soft">
            Ingen steder passer.{" "}
            <button
              className="font-bold text-ink underline"
              onClick={() => {
                setQuery("");
                setFilters(new Set());
                setCuisine(null);
              }}
            >
              Vis alle
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

// Dagens tilbud fra alle steder samlet øverst, som forsiden af en tilbudsavis
function OfferStrip({ places }: { places: Place[] }) {
  if (places.length === 0) return null;
  return (
    <section className="mt-5" aria-label="Dagens tilbud">
      <h2 className="font-display text-2xl font-black tracking-tight">Dagens tilbud</h2>
      <div className="-mx-5 mt-2 flex snap-x gap-3 overflow-x-auto px-5 pb-3 pt-1 [scrollbar-width:none]">
        {places.map((p) => (
          <Link
            key={p.slug}
            href={`/sted/${p.slug}#dagens-tilbud`}
            className={`flex shrink-0 snap-start flex-col border-[3px] border-ink bg-buoy px-3 py-2.5 shadow-[4px_4px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${places.length === 1 ? "w-full" : "w-64"}`}
          >
            <span className="text-sm font-bold uppercase tracking-[0.12em]">{p.name}</span>
            <span className="mt-0.5 line-clamp-2 font-display text-lg font-bold leading-snug">{p.news!.text}</span>
            {p.news!.price && (
              <span className="mt-auto pt-1">
                <span className="font-display text-3xl font-black tabular-nums text-stamp">{offerPrice(p.news!.price)}</span>
                {p.news!.wasPrice && <span className="ml-2 line-through">før {offerPrice(p.news!.wasPrice)}</span>}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

// "ca. 35 min" ved steder, man kan bestille fra lige nu. Restauranten skruer op, når der er travlt.
function WaitText({ place, now }: { place: Place; now: Date }) {
  const minutes = pickupOptions(place, now).asapMinutes;
  if (minutes === null) return null;
  return <span className={place.extraWaitMinutes ? "font-bold text-stamp" : ""}>
      {" "}
      · <span className="whitespace-nowrap">{place.extraWaitMinutes ? "Travlt, " : ""}ca. {minutes} min</span>
    </span>;
}

// Stemplerne sidder lidt skævt, som var de trykket med hånden
const TILTS = [-4, 3, -2, 2, -3];

const NUMBERS = ["Ingen", "Ét", "To", "Tre", "Fire", "Fem", "Seks", "Syv", "Otte", "Ni", "Ti", "Elleve", "Tolv"];

function openLine(count: number) {
  const n = NUMBERS[count] ?? String(count);
  if (count === 0) return "Ingen har åbent lige nu.";
  return `${n} ${count === 1 ? "sted har" : "steder har"} åbent lige nu.`;
}

function headline(now: Date | null) {
  if (!now) return "Hvem har åbent?";
  const hour = Math.floor(copenhagenNow(now).minutes / 60);
  return hour >= 16 || hour < 4 ? "Hvem har åbent i aften?" : "Hvem har åbent i dag?";
}
