"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { copenhagenNow, openStatus, toTime } from "@/lib/hours";
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

export function PlaceBrowser({ places, title = "Hvem har åbent?" }: { places: Place[]; title?: string }) {
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
    `shrink-0 rounded-full border-2 px-4 py-2 text-base transition-colors ${
      on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink-soft"
    }`;

  return (
    <div>
      <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight">{title}</h1>
      <p className="mt-2 min-h-7 text-lg text-ink-soft">
        {now && openCount !== null && (
          <>
            Klokken er {toTime(copenhagenNow(now).minutes)}.{" "}
            {openCount === 0 ? "Ingen har åbent lige nu." : `${openCount} ${openCount === 1 ? "sted har" : "steder har"} åbent lige nu.`}
          </>
        )}
      </p>

      <label className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 focus-within:border-ink">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span className="sr-only">Søg</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg, fx pizza eller durum"
          className="w-full bg-transparent py-3.5 text-lg outline-none placeholder:text-ink-soft/70"
        />
      </label>

      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
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

      <ul className="mt-5 overflow-hidden rounded-3xl bg-surface">
        {visible.map((p) => (
          <li key={p.slug} className="border-b border-line last:border-b-0">
            <Link href={`/sted/${p.slug}`} className="group block px-5 py-4 active:bg-paper">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-extrabold leading-tight tracking-tight group-hover:underline">{p.name}</h2>
                {p.acceptsOrders && <span className="shrink-0 rounded-full bg-buoy-soft px-2.5 py-0.5 text-sm font-bold text-buoy-deep">Bestil her</span>}
              </div>
              <p className="mt-0.5 text-ink-soft">
                {p.cuisines.join(", ")}
                {p.takeaway && " · takeaway"}
              </p>
              <div className="mt-2.5">
                <OpenSign place={p} now={now} />
              </div>
            </Link>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-5 py-10 text-center text-lg text-ink-soft">
            Ingen steder passer.{" "}
            <button
              className="font-bold text-sea underline"
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
