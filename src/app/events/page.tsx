import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { RefreshWhileTranslating } from "@/components/LangSwitch";
import { upcoming } from "@/lib/events";
import { longDate } from "@/lib/format";
import { todayInCopenhagen } from "@/lib/hours";
import { translator } from "@/lib/i18n";
import { store } from "@/lib/store";
import { chooseLang, translateEvents } from "@/lib/translate";
import { CITY } from "@/lib/site";

export const dynamic = "force-dynamic";

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function EventsPage() {
  const today = todayInCopenhagen();
  const events = upcoming(await store.listEvents(today), today);
  const lang = await chooseLang();
  const translation = await translateEvents(events, [], lang);
  const t = translator(lang, translation.texts);
  const days = [...new Set(events.map((e) => e.date))];
  const dayName = (d: string) => (d === today ? t("I dag") : d === addDays(today, 1) ? t("I morgen") : longDate(d, lang));

  return (
    <AppShell>
      <main lang={lang} className="mx-auto max-w-2xl px-5 pb-16 pt-8">
        <h1 className="font-display text-[2.6rem] font-black leading-[1.02] tracking-tight">{t("Hvad sker der i {by}?", { by: CITY })}</h1>
        {events.length === 0 ? (
          <div className="mt-6 border-y-[3px] border-double border-ink px-1 py-6 text-lg">
            <p>{t("Koncerter, markeder, festivaler og alt det andet, der sker i byen, kommer her snart.")}</p>
            <p className="mt-3 text-ink-soft">{t("Indtil da kan du finde noget godt at spise under Mad.")}</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-lg text-ink-soft">{t("Tryk på Spis før, så finder vi et sted at spise inden.")}</p>
            {days.map((d) => (
              <section key={d}>
                <h2 className="mt-8 border-t-[3px] border-double border-ink pt-2.5 font-display text-[1.5rem] font-black tracking-tight first-letter:uppercase">
                  {dayName(d)}
                </h2>
                {events.filter((e) => e.date === d).map((e) => (
                  <EventCard key={e.id} event={e} t={t} />
                ))}
              </section>
            ))}
          </>
        )}
        {translation.state === "working" && <RefreshWhileTranslating lang={lang} />}
      </main>
    </AppShell>
  );
}
