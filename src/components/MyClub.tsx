"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { badgeProgress, COMEBACK, comeback, type Badge } from "@/lib/badges";
import { CITY } from "@/lib/site";
import type { Place } from "@/lib/types";
import { readStored, useMyOrders, writeStored } from "./useStored";
import { useLang } from "./useLang";

// Assens Mester-Spiser: mærker for det, du bestiller. Regnes ud på din telefon.
export function MyClub() {
  const orders = useMyOrders();
  const { t } = useLang();
  if (orders.length === 0) return null;
  const all = badgeProgress(orders, CITY);
  const earned = all.filter((b) => b.earned);
  // De to, man er tættest på
  const next = all.filter((b) => !b.earned && b.have > 0).sort((a, b) => b.have / b.need - a.have / a.need).slice(0, 2);

  return (
    <section className="mt-10 border-t-[3px] border-double border-ink pt-2.5">
      <h2 className="font-display text-[1.7rem] font-black tracking-tight">{t("{by} Mester-Spiser", { by: CITY })}</h2>
      <p className="text-lg text-ink-soft">{t("Dine mærker. Telefonen husker dem, så de er kun dine.")}</p>
      {earned.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {earned.map((b) => (
            <li key={b.id} className="border-2 border-ink bg-surface px-3 py-3">
              <span className="text-3xl" aria-hidden>{b.emoji}</span>
              <p className="mt-1 font-display text-lg font-semibold leading-tight">{t(b.name, b.vars)}</p>
              <p className="text-ink-soft">{t(b.text, b.vars)}</p>
            </li>
          ))}
        </ul>
      )}
      {next.length > 0 && (
        <ul className="mt-3 space-y-2">
          {next.map((b) => (
            <li key={b.id} className="flex items-center gap-3 border-2 border-dashed border-ink-soft/60 px-3 py-2.5">
              <span className="text-2xl opacity-50 grayscale" aria-hidden>{b.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{t(b.name, b.vars)}</span>
                <span className="block text-ink-soft">{t("{n} af {i_alt}", { n: b.have, i_alt: b.need })}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Vises på kvitteringen, når en bestilling gav et nyt mærke
export function NewBadges({ badges }: { badges: Badge[] }) {
  const { t } = useLang();
  if (badges.length === 0) return null;
  return (
    <div className="border-2 border-ink bg-buoy/40 px-4 py-4">
      {badges.map((b) => (
        <p key={b.id} className="flex items-center gap-3 text-lg">
          <span className="text-4xl" aria-hidden>{b.emoji}</span>
          <span>
            <span className="block text-sm font-bold uppercase tracking-[0.12em]">{t("Nyt mærke")}</span>
            <span className="block font-display text-xl font-semibold leading-tight">{t(b.name, b.vars)}</span>
          </span>
        </p>
      ))}
      <Link href="/favoritter" className="mt-2 inline-block font-bold underline">{t("Se alle dine mærker ›")}</Link>
    </div>
  );
}

const WEEK = 7 * 24 * 3600_000;
const hiddenKey = (slug: string) => `assensnu:hilsen-skjult:${slug}`;
const textKey = (slug: string, lang: string) => `assensnu:hilsen:${slug}:${lang}`;

// "Hey! Det er længe siden ..." på forsiden, når du plejer at bestille et sted, men ikke har gjort det i 3 uger
export function Comeback({ places }: { places: Place[] }) {
  const orders = useMyOrders();
  const { lang, t } = useLang();
  const [hidden, setHidden] = useState(true);
  const [text, setText] = useState<string | null>(null);
  const canOrder = (slug: string) => places.some((p) => p.slug === slug && p.member && p.acceptsOrders);
  const c = orders.length >= 3 ? comeback(orders, canOrder) : null;

  useEffect(() => {
    if (!c) return;
    const until = readStored<number>(hiddenKey(c.slug), 0);
    if (typeof until === "number" && until > Date.now()) return;
    setHidden(false);
    // Hilsenen skrives én gang om ugen og huskes på telefonen
    const saved = readStored<{ text: string; at: number } | null>(textKey(c.slug, lang), null);
    if (saved?.text && Date.now() - saved.at < WEEK) return setText(saved.text);
    fetch("/api/hilsen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...c, lang }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { text?: string | null } | null) => {
        if (!data?.text) return;
        writeStored(textKey(c.slug, lang), { text: data.text, at: Date.now() });
        setText(data.text);
      })
      .catch(() => {});
    // c ændrer sig ikke, så længe de samme bestillinger ligger på telefonen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.slug, c?.days, lang]);

  if (!c || hidden) return null;
  const message = text ?? t(COMEBACK, { ret: c.dish ? t(c.dish) : t("noget lækkert"), sted: c.street || c.placeName });

  return (
    <div className="mt-5 -rotate-[0.6deg] border-2 border-dashed border-stamp bg-paper px-4 py-4 shadow-[3px_3px_0_var(--color-ink)]">
      <p className="font-display text-xl font-semibold leading-snug">{message}</p>
      <div className="mt-3 flex items-center gap-4">
        <Link href={`/sted/${c.slug}`} className="bg-stamp px-4 py-3 text-lg font-bold text-white">
          {t("Se menuen hos {navn} ›", { navn: c.placeName })}
        </Link>
        <button
          onClick={() => {
            writeStored(hiddenKey(c.slug), Date.now() + 2 * WEEK);
            setHidden(true);
          }}
          className="py-2 text-lg underline"
        >
          {t("Ikke nu")}
        </button>
      </div>
    </div>
  );
}
