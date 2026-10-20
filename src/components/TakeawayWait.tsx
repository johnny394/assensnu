"use client";

import { pickupOptions } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { useLang } from "./useLang";
import { useNow } from "./useNow";

// Ventetiden på takeaway lige nu. Restauranten sætter den med ét tryk i panelet.
// Har stedet lukket, men åbner senere i dag, står der i stedet, at man kan bestille til senere.
export function TakeawayWait({ place }: { place: Pick<Place, "hours" | "closedToday" | "prepMinutes" | "extraWaitMinutes" | "acceptsOrders"> }) {
  const now = useNow();
  const { t } = useLang();
  if (!now || !place.acceptsOrders) return null;
  const { asapMinutes: minutes, slots } = pickupOptions(place, now);
  if (minutes === null) {
    // Lukket nu, men åbner senere i dag: man kan godt bestille allerede nu
    if (slots.length === 0) return null;
    return (
      <p className="mt-3 text-lg">
        {t("Bestil allerede nu til senere i dag. Maden kan være klar fra")} <strong className="whitespace-nowrap tabular-nums">{t("kl. {tid}", { tid: slots[0] })}</strong>.
      </p>
    );
  }
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
      <span>
        {t("Takeaway er klar om")} <strong className="whitespace-nowrap tabular-nums">{t("ca. {min} min", { min: minutes })}</strong>
      </span>
      {place.extraWaitMinutes > 0 && <span className="whitespace-nowrap border-2 border-stamp px-1.5 py-0.5 text-sm font-bold uppercase tracking-[0.1em] text-stamp">{t("Travlt lige nu")}</span>}
    </p>
  );
}
