"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { copenhagenNow, openStatus } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { OpenSign } from "./OpenSign";
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
  const openCount = now ? places.filter((p) => state(p) === "open").length : null;

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
    .sort((a, b) => RANK[state(a)] - RANK[state(b)] || a.name.localeCompare(b.name, "da"));

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
        {visible.map((p, i) => (
          <li key={p.slug} className="border-b border-ink">
            <Link href={`/sted/${p.slug}`} className="group flex items-center justify-between gap-3 py-4 active:bg-surface">
              <div className="min-w-0">
                <h2 className={`font-display text-[1.55rem] font-semibold leading-tight group-hover:underline ${state(p) === "open" ? "" : "text-ink-soft"}`}>
                  {p.name}
                </h2>
                <p className="mt-1 text-sm uppercase tracking-[0.1em] text-ink-soft">
                  {[...p.cuisines, p.takeaway && "Takeaway"].filter(Boolean).join(" · ")}
                  {p.acceptsOrders && <span className="font-bold text-stamp"> · Bestil her</span>}
                </p>
              </div>
              <OpenSign place={p} now={now} tilt={TILTS[i % TILTS.length]} />
            </Link>
          </li>
        ))}
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
