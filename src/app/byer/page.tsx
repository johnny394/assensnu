import Link from "next/link";
import type { Metadata } from "next";
import { BynuMasthead } from "@/components/BynuMasthead";
import { ARTICLES } from "@/lib/articles";
import { BRAND, TOWN_SITES } from "@/lib/site";
import { pageT } from "@/lib/translate";

export const metadata: Metadata = {
  title: `${BRAND} · Hvem har åbent i din by?`,
  description: "Find spisestederne i din by. Se hvem der har åbent, bestil takeaway og book bord.",
};

// Forsiden på bynu.dk: vælg din by. Nye byer kommer på, når de står i TOWN_SITES.
export default async function TownsPage() {
  const t = await pageT();
  const towns = Object.entries(TOWN_SITES);
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 pb-16 pt-5">
      <BynuMasthead />

      <h1 className="mt-8 font-display text-[2.3rem] font-black leading-[1.05]">{t("Hvor er du?")}</h1>
      <p className="mt-2 text-lg text-ink-soft">{t("Vælg din by, og se hvem der har åbent lige nu.")}</p>

      <ul className="mt-6 border-t-[3px] border-double border-ink">
        {towns.map(([name, url]) => (
          <li key={name} className="border-b border-ink">
            <a href={url} className="group flex items-center justify-between gap-4 py-5 active:bg-surface">
              <span>
                <span className="block font-display text-[2rem] font-semibold leading-tight group-hover:underline">{name}</span>
                <span className="text-sm uppercase tracking-[0.1em] text-ink-soft">{name}Nu</span>
              </span>
              <span aria-hidden className="font-display text-4xl text-stamp">›</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-10 border-2 border-dashed border-ink-soft px-4 py-4 text-base text-ink-soft">
        {t("Flere byer er på vej.")}
      </p>

      <section className="mt-12 border-t-[3px] border-double border-ink">
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/artikel/${a.slug}`} className="group block border-b border-ink py-5 active:bg-surface">
            <span className="text-sm font-bold uppercase tracking-[0.12em] text-stamp">{a.kicker}</span>
            <span className="mt-1 block font-display text-[1.6rem] font-semibold leading-tight group-hover:underline">{a.title}</span>
            <span className="mt-1 block text-base text-ink-soft">{a.lead}</span>
            <span className="mt-2 block font-bold underline">Læs mere ›</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
