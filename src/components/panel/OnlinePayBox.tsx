"use client";

import { useEffect, useState } from "react";
import type { OnlinePayState } from "@/lib/payment";

const RETURN: Record<string, string> = {
  klar: "Online betaling er slået til. Kunderne kan betale med MobilePay og kort nu.",
  venter: "Stripe mangler stadig nogle oplysninger, eller de er ved at tjekke dem. Det tager som regel kun et par minutter.",
  fejl: "Det gik ikke at komme over til Stripe. Prøv igen om lidt.",
};

// Restauranten kobler sin egen Stripe-konto på, så kunderne kan betale med MobilePay og kort
export function OnlinePayBox({ state }: { state: OnlinePayState }) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get("betaling");
    if (back && RETURN[back]) setMessage(RETURN[back]);
  }, []);
  if (state === "unavailable") return null;

  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Online betaling</p>
      {message && <p role="status" className={`mt-1 font-bold ${state === "on" ? "text-go" : "text-signal"}`}>{message}</p>}
      {state === "on" ? (
        <>
          <p className="mt-1 text-lg font-bold text-go">✓ Slået til. Kunderne kan betale med MobilePay og kort.</p>
          <p className="text-ink-soft">Pengene bliver først trukket, når I trykker Accepter. Afviser I en ordre, får kunden pengene tilbage af sig selv. Stripe sender pengene ind på jeres bankkonto.</p>
        </>
      ) : (
        <>
          <p className="text-ink-soft">
            {state === "started"
              ? "I er gået i gang. Stripe mangler stadig nogle oplysninger, før kunderne kan betale online."
              : "Lad kunderne betale med MobilePay og kort, når de bestiller. Pengene går direkte ind på jeres egen bankkonto."}
          </p>
          {state === "off" && <p className="mt-2 text-ink-soft">Det tager 5-10 minutter. Hav CVR-nummer, ejerens fødselsdato og jeres kontonummer klar.</p>}
          <a href="/api/panel/betaling" className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl bg-buoy px-5 text-lg font-bold">
            {state === "started" ? "Fortsæt hos Stripe" : "Slå online betaling til"}
          </a>
          {state === "started" && (
            <a href="/api/panel/betaling?tjek=1" className="mt-2 block text-center text-lg text-ink-soft underline">
              Jeg er færdig. Tjek igen
            </a>
          )}
        </>
      )}
    </div>
  );
}
