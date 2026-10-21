import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { longDate } from "@/lib/format";
import { CAMPSITE } from "@/lib/orders";
import { qrSvg, siteOrigin } from "@/lib/qr";
import { store } from "@/lib/store";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Skilt · AssensNu", robots: { index: false } };

type Sign = { kicker?: string; headline: string; da: string; en: string; de: string; path: string };

// Et skilt til receptionen, disken eller billetmailen. Turisterne får siden på deres eget sprog, når de scanner.
async function sign(q: { sted?: string; navn?: string; event?: string; til?: string }): Promise<Sign | null> {
  const where = q.navn?.trim().slice(0, 60);
  if (q.event) {
    const e = await store.getEvent(q.event);
    if (!e) return null;
    return {
      kicker: `${e.title} · ${longDate(e.date)} kl. ${e.time}`,
      headline: "Spis før?",
      da: "Scan her, og find et bord eller takeaway, der er klar i god tid.",
      en: "Eat before? Scan here for a table or takeaway ready in time.",
      de: "Vorher essen? Hier scannen für einen Tisch oder Essen zum Mitnehmen.",
      path: `/events/${e.id}`,
    };
  }
  if (q.sted) {
    const p = await store.getPlace(q.sted);
    if (!p) return null;
    return {
      kicker: where ? `Til gæsterne på ${where}` : p.name,
      headline: "Sult?",
      da: `Scan her, og se menuen hos ${p.name}. Bestil, og hent når den er klar.`,
      en: `Hungry? Scan here for the menu at ${p.name}, in English.`,
      de: `Hunger? Hier scannen für die Speisekarte von ${p.name}, auf Deutsch.`,
      path: `/sted/${p.slug}`,
    };
  }
  if (q.til === "camping") {
    return {
      kicker: where ? `Til gæsterne på ${where}` : `Til gæsterne på ${CAMPSITE}`,
      headline: "Sult?",
      da: "Scan her, og få maden bragt helt ud til jeres plads. I betaler, når den kommer.",
      en: "Hungry? Scan here and get food brought to your pitch. Menus in English.",
      de: "Hunger? Hier scannen, Essen kommt zu Ihrem Stellplatz. Speisekarten auf Deutsch.",
      path: "/?til=camping",
    };
  }
  return {
    kicker: where ? `Til gæsterne på ${where}` : "Alle spisesteder i Assens",
    headline: "Sult?",
    da: "Scan her, og se hvem der har åbent lige nu. Bestil takeaway eller book et bord.",
    en: "Hungry? Scan here to see who is open now. Menus in English.",
    de: "Hunger? Hier scannen und sehen, wer geöffnet hat. Speisekarten auf Deutsch.",
    path: "/",
  };
}

export default async function SignPage({ searchParams }: { searchParams: Promise<{ sted?: string; navn?: string; event?: string; til?: string }> }) {
  const s = await sign(await searchParams);
  if (!s) notFound();
  const url = `${await siteOrigin()}${s.path}`;
  const svg = await qrSvg(url);

  return (
    <main className="mx-auto max-w-xl px-5 py-6 print:max-w-none print:p-0">
      <div className="mb-6 space-y-2 print:hidden">
        <PrintButton />
        <p className="text-center text-ink-soft">Print på A4 eller A5. Hæng det, hvor folk venter.</p>
      </div>
      <article className="flex aspect-[1/1.414] flex-col border-[3px] border-ink bg-paper px-[7%] py-[6%] print:h-[100vh] print:border-0">
        <p className="text-center font-display text-[2rem] font-black leading-none tracking-tight">AssensNu</p>
        <div className="mt-2 h-[7px] border-y border-t-[3px] border-ink" aria-hidden />
        {s.kicker && <p className="mt-3 text-center text-sm uppercase tracking-[0.14em]">{s.kicker}</p>}
        <h1 className="mt-4 text-center font-display text-[5.5rem] font-black leading-[0.9] tracking-tight text-stamp">{s.headline}</h1>
        <p className="mx-auto mt-4 max-w-[26ch] text-center text-[1.35rem] font-bold leading-snug">{s.da}</p>
        <div className="mx-auto my-auto w-[58%] py-5 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="space-y-1 border-t border-ink pt-3 text-center text-[1.05rem] leading-snug">
          <p lang="en">{s.en}</p>
          <p lang="de">{s.de}</p>
        </div>
        <p className="mt-3 text-center text-sm text-ink-soft">{url.replace(/^https?:\/\//, "")}</p>
      </article>
    </main>
  );
}
