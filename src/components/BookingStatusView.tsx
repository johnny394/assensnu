"use client";

import { longDate, telLink } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { usePolling } from "./usePolling";

export function BookingStatusView({ initial, placePhone }: { initial: Booking; placePhone?: string }) {
  const b = usePolling<Booking>(`/api/bookings/${initial.id}`, initial);
  const when = `${longDate(b.date)} kl. ${b.time}`;
  const people = `${b.guests} ${b.guests === 1 ? "person" : "personer"}`;

  const box = {
    requested: { tone: "bg-surface", title: "Venter på svar", text: `Vi har sendt din forespørgsel til ${b.placeName}. Siden her opdaterer sig selv, når de svarer.` },
    confirmed: { tone: "bg-go-soft", title: "Bordet er bekræftet", text: `${b.placeName} glæder sig til at se jer.` },
    declined: { tone: "bg-signal-soft", title: "Der er desværre ikke plads", text: `${b.placeName} har ikke et bord på det tidspunkt. Prøv en anden dag eller tid.` },
    suggested: { tone: "bg-stamp-soft", title: `De foreslår kl. ${b.suggestedTime}`, text: `${b.placeName} har ikke plads kl. ${b.time}, men gerne kl. ${b.suggestedTime}. Ring og sig ja, så er det på plads.` },
  }[b.status];

  return (
    <div className="space-y-4">
      <div className={`border-2 border-ink px-5 py-6 ${box.tone}`}>
        <p className="font-display text-3xl font-black tracking-tight">{box.title}</p>
        <p className="mt-2 text-lg">{box.text}</p>
        {(b.status === "suggested" || b.status === "declined") && placePhone && (
          <a href={telLink(placePhone)} className="mt-4 block bg-ink px-5 py-3.5 text-center text-lg font-bold text-paper">
            Ring {placePhone}
          </a>
        )}
      </div>
      <div className="border-2 border-ink bg-surface px-5 py-4 text-lg">
        <p className="font-bold first-letter:uppercase">{when}</p>
        <p>{people} · {b.customerName}, {b.customerPhone}</p>
        {b.note && <p className="text-ink-soft">{b.note}</p>}
      </div>
    </div>
  );
}
