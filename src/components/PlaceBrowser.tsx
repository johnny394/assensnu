"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { copenhagenNow, openStatus, pickupOptions } from "@/lib/hours";
import { clockTime } from "@/lib/live";
import type { T } from "@/lib/i18n";
import type { Place } from "@/lib/types";
import { LangSwitch } from "./LangSwitch";
import { OfferStrip } from "./Offers";
import { OpenSign } from "./OpenSign";
import { offerPrice } from "./TodaysOffer";
import { useLang } from "./useLang";
import { useNow } from "./useNow";

type Filter = "open" | "takeaway" | "dineIn" | "boat";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Åben nu" },
  { key: "takeaway", label: "Takeaway" },
  { key: "dineIn", label: "Spis på stedet" },
  { key: "boat", label: "Til båden" },
];

const RANK = { open: 0, closed: 1, unknown: 2 } as const;

// languages: sprogknapperne øverst, kun på forsiden
export function PlaceBrowser({ places, title, languages }: { places: Place[]; title?: string; languages?: boolean }) {
  const now = useNow();
  const { lang, t } = useLang();
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
      if (filters.has("boat") && !(p.acceptsOrders && p.delivery?.harbour)) return false;
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
      <h1 className="font-display text-[2.6rem] font-black leading-[1.02] tracking-tight">{title ?? headline(now, t)}</h1>
      <p className="mt-2 min-h-7 text-lg text-ink-soft">{openCount !== null && openLine(openCount, t, lang === "da")}</p>
      {languages && <LangSwitch />}

      <OfferStrip places={places} />

      <label className="mt-5 flex items-center gap-3 border-b-2 border-ink px-1">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span className="sr-only">{t("Søg")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Søg, fx pizza eller durum")}
          className="w-full bg-transparent py-3 text-lg outline-none placeholder:text-ink-soft"
        />
      </label>

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {/* "Til båden" vises kun, når mindst ét sted kommer ned i havnen */}
        {FILTERS.filter((f) => f.key !== "boat" || places.some((p) => p.member && p.acceptsOrders && p.delivery?.harbour)).map((f) => (
          <button key={f.key} onClick={() => toggle(f.key)} aria-pressed={filters.has(f.key)} className={chip(filters.has(f.key))}>
            {t(f.label)}
          </button>
        ))}
        {cuisines.map((c) => (
          <button key={c} onClick={() => setCuisine(cuisine === c ? null : c)} aria-pressed={cuisine === c} className={chip(cuisine === c)}>
            {t(c)}
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
                    {[...p.cuisines.map((c) => t(c)), p.takeaway && "Takeaway"].filter(Boolean).join(" · ")}
                    {p.acceptsOrders && <span className="font-bold text-stamp"> · {t("Bestil her")}</span>}
                    {p.acceptsOrders && now && <WaitText place={p} now={now} />}
                  </p>
                  {p.lastChance && (
                    <p className="mt-1 text-base">
                      <span className="mr-1.5 bg-stamp px-1.5 py-0.5 text-sm font-black uppercase tracking-[0.08em] text-white">{t("Sidste chance")}</span>
                      {t(p.lastChance.itemIds.length === 1 ? "Halv pris på 1 ret til kl. {tid}" : "Halv pris på {n} retter til kl. {tid}", {
                        n: p.lastChance.itemIds.length,
                        tid: clockTime(p.lastChance.until),
                      })}
                    </p>
                  )}
                  {p.news && (
                    <p className="mt-1 line-clamp-2 text-base">
                      <span className="mr-1.5 bg-buoy px-1.5 py-0.5 text-sm font-black uppercase tracking-[0.08em]">{t("Tilbud")}</span>
                      {t(p.news.text)}
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
              <div className="flex items-center justify-between gap-3 py-4" aria-label={`${p.name}, ${t("Kommer snart").toLowerCase()}`}>
                <div className="min-w-0 opacity-55">
                  <h2 className="font-display text-[1.55rem] font-semibold leading-tight text-ink-soft">{p.name}</h2>
                  <p className="mt-1 text-sm uppercase tracking-[0.1em] text-ink-soft">{p.cuisines.map((c) => t(c)).join(" · ")}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 border-2 border-dashed border-ink-soft px-2.5 py-1.5 text-sm font-bold uppercase leading-tight tracking-[0.08em] text-ink-soft">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <rect x="5" y="11" width="14" height="10" rx="1.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  {t("Kommer snart")}
                </span>
              </div>
            </li>
          ),
        )}
        {visible.length === 0 && (
          <li className="border-b border-ink py-10 text-center text-lg text-ink-soft">
            {t("Ingen steder passer.")}{" "}
            <button
              className="font-bold text-ink underline"
              onClick={() => {
                setQuery("");
                setFilters(new Set());
                setCuisine(null);
              }}
            >
              {t("Vis alle")}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

// "ca. 35 min" ved steder, man kan bestille fra lige nu. Restauranten skruer op, når der er travlt.
function WaitText({ place, now }: { place: Place; now: Date }) {
  const { t } = useLang();
  const minutes = pickupOptions(place, now).asapMinutes;
  if (minutes === null) return null;
  return <span className={place.extraWaitMinutes ? "font-bold text-stamp" : ""}>
      {" "}
      · <span className="whitespace-nowrap">{place.extraWaitMinutes ? t("Travlt, ") : ""}{t("ca. {min} min", { min: minutes })}</span>
    </span>;
}

// Stemplerne sidder lidt skævt, som var de trykket med hånden
const TILTS = [-4, 3, -2, 2, -3];

const NUMBERS = ["Ingen", "Ét", "To", "Tre", "Fire", "Fem", "Seks", "Syv", "Otte", "Ni", "Ti", "Elleve", "Tolv"];

function openLine(count: number, t: T, danish: boolean) {
  if (count === 0) return t("Ingen har åbent lige nu.");
  if (count === 1) return t("Ét sted har åbent lige nu.");
  // På dansk skrives tallet med bogstaver, på engelsk og tysk med tal
  return t("{n} steder har åbent lige nu.", { n: danish ? (NUMBERS[count] ?? String(count)) : count });
}

function headline(now: Date | null, t: T) {
  if (!now) return t("Hvem har åbent?");
  const hour = Math.floor(copenhagenNow(now).minutes / 60);
  return t(hour >= 16 || hour < 4 ? "Hvem har åbent i aften?" : "Hvem har åbent i dag?");
}
