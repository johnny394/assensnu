"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { copenhagenNow, describeStatus, openStatus } from "@/lib/hours";
import { FRONT_PAGE_OFFERS, rankOffers } from "@/lib/offers";
import type { Place } from "@/lib/types";
import { offerPrice } from "./TodaysOffer";
import { useFavorites } from "./useFavorites";
import { useNow } from "./useNow";

// Tilbuddene i den rækkefølge, kunden ser dem. Null, indtil siden er indlæst i browseren.
function useOffers(places: Place[]) {
  const now = useNow();
  const { favorites } = useFavorites();
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => setSeed(Math.random()), []);
  if (!now || seed === null) return null;
  return { now, offers: rankOffers(places, { now, favorites, seed }) };
}

function OfferCard({ place, now, wide }: { place: Place; now: Date; wide?: boolean }) {
  const news = place.news!;
  const status = openStatus(place, now);
  const open = status.state === "open";
  return (
    <Link
      href={`/sted/${place.slug}#dagens-tilbud`}
      className={`flex flex-col border-[3px] border-ink px-3 py-2.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
        open ? "bg-buoy shadow-[4px_4px_0_var(--color-ink)]" : "bg-surface text-ink-soft"
      } ${wide ? "w-full" : "w-64 shrink-0 snap-start"}`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold uppercase tracking-[0.12em]">{place.name}</span>
        {!open && <span className="shrink-0 text-sm">{describeStatus(status, copenhagenNow(now).day).replace(/^Lukket, /, "")}</span>}
      </span>
      <span className="mt-0.5 line-clamp-2 font-display text-lg font-bold leading-snug">{news.text}</span>
      {news.price && (
        <span className="mt-auto pt-1">
          <span className={`font-display text-3xl font-black tabular-nums ${open ? "text-stamp" : ""}`}>{offerPrice(news.price)}</span>
          {news.wasPrice && <span className="ml-2 line-through">før {offerPrice(news.wasPrice)}</span>}
        </span>
      )}
    </Link>
  );
}

// På forsiden: højst fem tilbud fra steder med åbent nu, og et link til resten
export function OfferStrip({ places }: { places: Place[] }) {
  const data = useOffers(places);
  if (!data) return null;
  const open = data.offers.filter((o) => o.open);
  const shown = open.slice(0, FRONT_PAGE_OFFERS);
  const total = data.offers.length;
  if (total === 0) return null;
  return (
    <section className="mt-5" aria-label="Dagens tilbud">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-black tracking-tight">Dagens tilbud</h2>
        {total > shown.length && (
          <Link href="/tilbud" className="shrink-0 text-lg font-bold underline decoration-stamp decoration-2 underline-offset-4">
            Se alle {total} ›
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="mt-1 text-lg text-ink-soft">Stederne med tilbud i dag har ikke åbent lige nu.</p>
      ) : (
        <div className="-mx-5 mt-2 flex snap-x gap-3 overflow-x-auto px-5 pb-3 pt-1 [scrollbar-width:none]">
          {shown.map((o) => (
            <OfferCard key={o.place.slug} place={o.place} now={data.now} wide={shown.length === 1} />
          ))}
        </div>
      )}
    </section>
  );
}

// Tilbudsavisen: alle dagens tilbud i hele byen. Åbne steder først.
export function OfferPaper({ places }: { places: Place[] }) {
  const data = useOffers(places);
  if (!data) return <div className="h-40" aria-hidden />;
  if (data.offers.length === 0) {
    return (
      <div className="mt-6 border-y-[3px] border-double border-ink px-1 py-6 text-lg">
        <p>Ingen steder har lagt et tilbud ud endnu i dag. Kig forbi igen senere, eller følg dine yndlingssteder, så får du besked.</p>
        <Link href="/" className="mt-3 inline-block font-bold underline decoration-stamp decoration-2 underline-offset-4">
          Se alle spisesteder
        </Link>
      </div>
    );
  }
  const open = data.offers.filter((o) => o.open);
  const closed = data.offers.filter((o) => !o.open);
  return (
    <>
      <p className="mt-2 text-lg text-ink-soft">
        {open.length === 1 ? "Ét tilbud" : `${open.length} tilbud`} fra steder med åbent lige nu.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {open.map((o) => (
          <OfferCard key={o.place.slug} place={o.place} now={data.now} wide />
        ))}
      </div>
      {closed.length > 0 && (
        <>
          <h2 className="mt-8 border-t-[3px] border-double border-ink pt-2.5 font-display text-xl font-black tracking-tight">Ikke åbent lige nu</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {closed.map((o) => (
              <OfferCard key={o.place.slug} place={o.place} now={data.now} wide />
            ))}
          </div>
        </>
      )}
    </>
  );
}
