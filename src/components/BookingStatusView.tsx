"use client";

import { longDate, telLink } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { HomeScreenGuide } from "./HomeScreenGuide";
import { useLang } from "./useLang";
import { usePolling } from "./usePolling";

export function BookingStatusView({ initial, placePhone, pushKey }: { initial: Booking; placePhone?: string; pushKey: string | null }) {
  const b = usePolling<Booking>(`/api/bookings/${initial.id}`, initial);
  const { lang, t } = useLang();
  const when = `${longDate(b.date, lang)}, ${t("kl. {tid}", { tid: b.time })}`;
  const people = t(b.guests === 1 ? "{n} person" : "{n} personer", { n: b.guests });
  const vars = { navn: b.placeName, tid: b.time, forslag: b.suggestedTime ?? "" };

  const box = {
    requested: { tone: "bg-surface", title: t("Venter på svar"), text: t("Vi har sendt din forespørgsel til {navn}. Siden her opdaterer sig selv, når de svarer.", vars) },
    confirmed: { tone: "bg-go-soft", title: t("Bordet er bekræftet"), text: t("{navn} glæder sig til at se jer.", vars) },
    declined: { tone: "bg-signal-soft", title: t("Der er desværre ikke plads"), text: t("{navn} har ikke et bord på det tidspunkt. Prøv en anden dag eller tid.", vars) },
    suggested: { tone: "bg-stamp-soft", title: t("De foreslår kl. {forslag}", vars), text: t("{navn} har ikke plads kl. {tid}, men gerne kl. {forslag}. Ring og sig ja, så er det på plads.", vars) },
  }[b.status];

  return (
    <div className="space-y-4">
      <div className={`border-2 border-ink px-5 py-6 ${box.tone}`}>
        <p className="font-display text-3xl font-black tracking-tight">{box.title}</p>
        <p className="mt-2 text-lg">{box.text}</p>
        {(b.status === "suggested" || b.status === "declined") && placePhone && (
          <a href={telLink(placePhone)} className="mt-4 block bg-ink px-5 py-3.5 text-center text-lg font-bold text-paper">
            {t("Ring {phone}", { phone: placePhone })}
          </a>
        )}
      </div>
      {b.status === "requested" && <HomeScreenGuide title={t("Få besked, når de svarer")} text={t("Så behøver du ikke holde øje med siden.")} push={{ kind: "booking", id: b.id, publicKey: pushKey }} />}
      <div className="border-2 border-ink bg-surface px-5 py-4 text-lg">
        <p className="font-bold first-letter:uppercase">{when}</p>
        <p>{people} · {b.customerName}, {b.customerPhone}</p>
        {b.note && <p className="text-ink-soft">{b.note}</p>}
      </div>
    </div>
  );
}
