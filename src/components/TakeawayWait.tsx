"use client";

import { pickupOptions } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { useNow } from "./useNow";

// Ventetiden på takeaway lige nu. Restauranten sætter den med ét tryk i panelet.
export function TakeawayWait({ place }: { place: Pick<Place, "hours" | "closedToday" | "prepMinutes" | "extraWaitMinutes" | "acceptsOrders"> }) {
  const now = useNow();
  if (!now || !place.acceptsOrders) return null;
  const minutes = pickupOptions(place, now).asapMinutes;
  if (minutes === null) return null;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
      <span>
        Takeaway er klar om <strong className="whitespace-nowrap tabular-nums">ca. {minutes} min</strong>
      </span>
      {place.extraWaitMinutes > 0 && <span className="whitespace-nowrap border-2 border-stamp px-1.5 py-0.5 text-sm font-bold uppercase tracking-[0.1em] text-stamp">Travlt lige nu</span>}
    </p>
  );
}
