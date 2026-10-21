import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { RefreshWhileTranslating } from "@/components/LangSwitch";
import { PickupLink } from "@/components/PickupLink";
import { eatBefore } from "@/lib/events";
import { longDate, telLink } from "@/lib/format";
import { todayInCopenhagen } from "@/lib/hours";
import { translator } from "@/lib/i18n";
import { store } from "@/lib/store";
import { chooseLang, translateEvents } from "@/lib/translate";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

// Spis før koncerten: steder, der har åbent i timerne før, med bord eller mad klar i god tid
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const event = await store.getEvent((await params).id);
  const today = todayInCopenhagen();
  if (!event || event.date < today) notFound();
  const options = eatBefore(await store.getPlaces(), event, today);
  const lang = await chooseLang();
  const translation = await translateEvents([event], options.map((o) => o.place), lang);
  const t = translator(lang, translation.texts);
  // Til restauranten, så den står på dansk
  const note = `Vi skal til ${event.title} kl. ${event.time}`;

  return (
    <AppShell>
      <main lang={lang} className="mx-auto max-w-2xl px-5 pb-16 pt-5">
        <Link href="/events" className="inline-block py-2 text-lg text-ink-soft">
          {t("‹ Alle events")}
        </Link>
        <p className="mt-2 text-lg text-ink-soft first-letter:uppercase">{longDate(event.date, lang)}</p>
        <EventCard event={event} t={t} eatLink={false} />

        <h2 className="mt-6 border-t-[3px] border-double border-ink pt-2.5 font-display text-[1.7rem] font-black tracking-tight">{t("Spis før")}</h2>
        {options.length === 0 ? (
          <p className="mt-2 text-lg text-ink-soft">{t("Ingen af stederne på {site} har åbent i timerne før. Se alle steder under Mad.", { site: SITE })}</p>
        ) : (
          <>
            <p className="mt-1 text-lg text-ink-soft">{t("Bordet er i god tid, så I når det. Restauranten svarer ja eller nej.")}</p>
            <ul className="mt-2">
              {options.map(({ place, bookTime, takeawayTime }) => (
                <li key={place.slug} className="border-b border-line py-4 last:border-b-0">
                  <Link href={`/sted/${place.slug}`} className="font-display text-[1.45rem] font-black leading-tight tracking-tight underline-offset-4 hover:underline">
                    {place.name}
                  </Link>
                  <p className="text-sm uppercase tracking-[0.12em] text-ink-soft">{place.cuisines.map((c) => t(c)).join(" · ")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bookTime && (
                      <Link
                        href={`/sted/${place.slug}/book?${new URLSearchParams({ dato: event.date, tid: bookTime, note })}`}
                        className="border-2 border-ink bg-ink px-4 py-2.5 text-lg font-bold text-paper"
                      >
                        {t("Bord kl. {tid}", { tid: bookTime })}
                      </Link>
                    )}
                    {takeawayTime && (
                      <PickupLink slug={place.slug} time={takeawayTime}>
                        {t("Mad klar kl. {tid}", { tid: takeawayTime })}
                      </PickupLink>
                    )}
                    {!bookTime && !takeawayTime && place.phone && (
                      <a href={telLink(place.phone)} className="border-2 border-ink px-4 py-2.5 text-lg font-bold">
                        {t("Ring {phone}", { phone: place.phone })}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {translation.state === "working" && <RefreshWhileTranslating lang={lang} />}
      </main>
    </AppShell>
  );
}
