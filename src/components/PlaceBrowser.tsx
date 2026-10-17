"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WEEKDAYS, copenhagenNow, openStatus, toTime } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { Monogram } from "./Monogram";
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

  const reset = () => {
    setQuery("");
    setFilters(new Set());
    setCuisine(null);
  };

  // Åbne steder får deres egen overskrift, så man straks ser dem
  const openNow = visible.filter((p) => state(p) === "open");
  const rest = visible.filter((p) => state(p) !== "open");
  const split = openNow.length > 0 && rest.length > 0;
  const clock = now ? copenhagenNow(now) : null;

  const chip = (on: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[0.95rem] ${
      on ? "bg-ink font-bold text-white shadow-card" : "bg-surface text-ink shadow-card hover:bg-paper-deep"
    }`;
  const check = (
    <svg viewBox="0 0 24 24" className="-ml-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );

  const list = (items: Place[], offset = 0) => (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((p, i) => (
        <li key={p.slug} className="rise min-w-0" style={{ animationDelay: `${Math.min(i + offset, 10) * 35}ms` }}>
          <Link
            href={`/sted/${p.slug}`}
            className="group flex h-full items-center gap-4 rounded-[1.4rem] bg-surface p-4 shadow-card hover:-translate-y-0.5 hover:shadow-lift"
          >
            <Monogram place={p} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[1.22rem] font-bold leading-tight tracking-[-0.02em]">{p.name}</h2>
              <p className="mt-0.5 text-[0.95rem] text-ink-soft">
                {p.cuisines.join(", ")}
                {p.takeaway && " · takeaway"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <OpenSign place={p} now={now} />
                {p.acceptsOrders && (
                  <span className="inline-flex items-center gap-1 rounded-[0.4rem] bg-sea-soft px-2 py-0.5 text-sm font-bold text-sea">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0" />
                    </svg>
                    Bestil her
                  </span>
                )}
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-soft/50 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 5 7 7-7 7" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <p className="flex min-h-7 items-center gap-2.5 text-[0.95rem] font-bold text-ink-soft">
        {clock && (
          <>
            <span className={`h-2.5 w-2.5 rounded-full ${openCount ? "beacon bg-buoy" : "bg-ink-soft/40"}`} aria-hidden />
            {WEEKDAYS[clock.day]} kl. {toTime(clock.minutes)}
          </>
        )}
      </p>
      <h1 className="mt-1 font-display text-[2.9rem] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-[4rem]">{title}</h1>
      <p className="mt-3 min-h-7 max-w-[34ch] text-lg text-ink-soft">
        {now && openCount !== null &&
          (openCount === 0 ? (
            "Ingen har åbent lige nu."
          ) : (
            <>
              <strong className="text-ink">{openCount} {openCount === 1 ? "sted" : "steder"}</strong> har åbent lige nu.
            </>
          ))}
      </p>

      <div className="mt-6 sm:flex sm:items-center sm:gap-3">
        <label className="flex items-center gap-3 rounded-[1.1rem] bg-surface px-4 shadow-card ring-ink transition-shadow focus-within:ring-2 sm:w-80 sm:shrink-0">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
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

        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 py-1 [scrollbar-width:none] sm:mx-0 sm:mt-0 sm:px-0">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => toggle(f.key)} aria-pressed={filters.has(f.key)} className={chip(filters.has(f.key))}>
              {filters.has(f.key) && check}
              {f.label}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden />
          {cuisines.map((c) => (
            <button key={c} onClick={() => setCuisine(cuisine === c ? null : c)} aria-pressed={cuisine === c} className={chip(cuisine === c)}>
              {cuisine === c && check}
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        {split ? (
          <>
            <h2 className="mb-3 px-1 text-sm font-bold text-ink-soft">Åbent nu</h2>
            {list(openNow)}
            <h2 className="mb-3 mt-8 px-1 text-sm font-bold text-ink-soft">Alle andre steder</h2>
            {list(rest, openNow.length)}
          </>
        ) : (
          list(visible)
        )}
        {visible.length === 0 && (
          <div className="rounded-[1.4rem] border-2 border-dashed border-line px-5 py-10 text-center text-lg text-ink-soft">
            <p>Ingen steder passer.</p>
            <button className="mt-3 rounded-full bg-ink px-5 py-2.5 font-bold text-white hover:bg-sea" onClick={reset}>
              Vis alle steder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
