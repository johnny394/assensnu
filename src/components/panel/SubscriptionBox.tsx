"use client";

import { useEffect, useState } from "react";
import { kr as price } from "@/lib/format";
import type { SubscriptionState } from "@/lib/payment";

const RETURN: Record<string, string> = {
  ok: "Tak! Abonnementet er i gang.",
  problem: "Kortet blev ikke godkendt. Prøv et andet kort.",
  slut: "Der er intet abonnement i gang.",
  fejl: "Det gik ikke at komme over til Stripe. Prøv igen om lidt.",
};

// Restaurantens abonnement hos ByNu: kort, der trækkes automatisk hver måned. Ingen binding.
export function SubscriptionBox({ state, kr }: { state: SubscriptionState; kr: number }) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get("abonnement");
    if (back && RETURN[back]) setMessage(RETURN[back]);
  }, []);
  if (state === "unavailable") return null;

  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Abonnement · {price(kr)} om måneden</p>
      {message && <p role="status" className={`mt-1 font-bold ${state === "active" ? "text-go" : "text-signal"}`}>{message}</p>}
      {state === "active" ? (
        <>
          <p className="mt-1 text-lg font-bold text-go">✓ Betalt. Pengene trækkes automatisk hver måned.</p>
          <p className="text-ink-soft">Ingen binding. Stopper I, kører abonnementet bare måneden ud.</p>
          <a href="/api/panel/abonnement" className="mt-2 block text-lg text-ink-soft underline">
            Skift kort, se kvitteringer eller stop abonnementet
          </a>
        </>
      ) : state === "problem" ? (
        <>
          <p className="mt-1 text-lg font-bold text-signal">Den sidste betaling gik ikke igennem.</p>
          <p className="text-ink-soft">Måske er kortet udløbet. Skriv et nyt kort, så prøver Stripe igen.</p>
          <a href="/api/panel/abonnement" className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl bg-buoy px-5 text-lg font-bold">
            Skift kort
          </a>
        </>
      ) : (
        <>
          <p className="text-ink-soft">Betales med kort og trækkes automatisk hver måned. Ingen binding: I kan stoppe, når I vil.</p>
          <a href="/api/panel/abonnement" className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl bg-buoy px-5 text-lg font-bold">
            Start abonnement
          </a>
        </>
      )}
    </div>
  );
}
