"use client";

import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import { PLAN_IDS, PLANS, PUSH_KR, type PlanSummary } from "@/lib/plans";

const RETURN: Record<string, string> = {
  ok: "Tak! Pakken er valgt.",
  skiftet: "Pakken er skiftet. Den nye pris gælder fra næste regning.",
  problem: "Kortet blev ikke godkendt. Prøv et andet kort.",
  slut: "I har ingen pakke valgt.",
  fejl: "Det gik ikke at komme over til Stripe. Prøv igen om lidt.",
};

// Restaurantens pakke hos ByNu: kort, der trækkes automatisk hver måned. Ingen binding.
export function SubscriptionBox({ summary }: { summary: PlanSummary }) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get("abonnement");
    if (back && RETURN[back]) setMessage(RETURN[back]);
  }, []);
  if (summary.state === "unavailable") return null;
  const { chosen, free, state } = summary;

  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Jeres pakke</p>
      {message && <p role="status" className={`mt-1 font-bold ${state === "problem" ? "text-signal" : "text-go"}`}>{message}</p>}

      {free ? (
        <p className="mt-1 text-lg">
          <strong>I har Fuld pakke gratis til og med 31. januar 2027.</strong>{" "}
          {chosen ? `Derefter fortsætter I med ${PLANS[chosen].name}. Den første betaling trækkes 1. februar.` : "Vælg allerede nu, hvilken pakke I vil fortsætte med. Der trækkes ingen penge før 1. februar."}
        </p>
      ) : state === "problem" ? (
        <p className="mt-1 text-lg font-bold text-signal">Den sidste betaling gik ikke igennem. Indtil den er betalt, har I Basis. Måske er kortet udløbet.</p>
      ) : !chosen ? (
        <p className="mt-1 text-lg font-bold text-signal">I har ingen pakke valgt, så I har Basis: menu og bordbooking. Vælg en pakke for at tage imod takeaway igen.</p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          const mine = chosen === id;
          return (
            <li key={id} className={`rounded-2xl border-2 px-4 py-3 ${mine ? "border-go bg-go-soft" : "border-line bg-paper"}`}>
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-bold">{plan.name}</span>
                <span className="whitespace-nowrap text-lg font-bold tabular-nums">{kr(plan.kr)}<span className="font-normal text-ink-soft"> /md.</span></span>
              </p>
              <ul className="mt-1 text-ink-soft">
                {plan.lines.map((l) => (
                  <li key={l}>· {l}</li>
                ))}
              </ul>
              {mine ? (
                <p className="mt-2 font-bold text-go">✓ Jeres pakke</p>
              ) : (
                <a href={`/api/panel/abonnement?pakke=${id}`} className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-buoy px-4 text-lg font-bold">
                  {chosen ? `Skift til ${plan.name}` : `Vælg ${plan.name}`}
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-ink-soft">Alle priser er plus moms. Betales med kort og trækkes automatisk hver måned. Ekstra beskeder til følgerne koster {kr(PUSH_KR)} stykket.</p>
      <p className="text-ink-soft">Ingen binding: stopper I, kører pakken bare måneden ud.</p>
      {chosen && (
        <a href="/api/panel/abonnement" className="mt-2 block text-lg text-ink-soft underline">
          Skift kort, se kvitteringer eller stop
        </a>
      )}
    </div>
  );
}
