"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { openStatus } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { OpenBadge, useNow } from "./OpenBadge";

type Filter = "open" | "takeaway" | "dineIn";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Åben nu" },
  { key: "takeaway", label: "Takeaway" },
  { key: "dineIn", label: "Spis her" },
];

export function PlaceBrowser({ places }: { places: Place[] }) {
  const now = useNow();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [cuisine, setCuisine] = useState<string | null>(null);

  const cuisines = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of places) for (const c of p.cuisines) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "da")).map(([c]) => c);
  }, [places]);

  const visible = places.filter((p) => {
    const q = query.trim().toLowerCase();
    if (q) {
      const haystack = [p.name, ...p.cuisines, ...p.menu.flatMap((c) => c.items.map((i) => i.name))].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (cuisine && !p.cuisines.includes(cuisine)) return false;
    if (filters.has("takeaway") && !p.takeaway) return false;
    if (filters.has("dineIn") && !p.dineIn) return false;
    if (filters.has("open") && (!now || openStatus(p, now).state !== "open")) return false;
    return true;
  });

  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
      active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
    }`;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Søg efter sted eller ret, fx pizza"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-stone-900"
      />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => toggle(f.key)} className={chip(filters.has(f.key))}>
            {f.label}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-stone-300" />
        {cuisines.map((c) => (
          <button key={c} onClick={() => setCuisine(cuisine === c ? null : c)} className={chip(cuisine === c)}>
            {c}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-stone-500">
        {visible.length} {visible.length === 1 ? "spisested" : "spisesteder"}
      </p>

      <ul className="mt-2 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {visible.map((p) => (
          <li key={p.slug}>
            <Link href={`/sted/${p.slug}`} className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-stone-50">
              <div className="min-w-0">
                <h2 className="font-semibold text-stone-900">{p.name}</h2>
                <p className="mt-0.5 text-sm text-stone-600">{p.cuisines.join(" · ")}</p>
                <p className="mt-0.5 truncate text-sm text-stone-500">{p.address}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <OpenBadge place={p} now={now} />
                  {p.takeaway && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs text-orange-800">Takeaway</span>}
                  {p.dineIn && <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs text-sky-800">Spis her</span>}
                </div>
              </div>
              <span aria-hidden className="mt-1 text-stone-400">›</span>
            </Link>
          </li>
        ))}
        {visible.length === 0 && <li className="px-4 py-10 text-center text-stone-500">Ingen spisesteder passer til din søgning.</li>}
      </ul>
    </div>
  );
}
