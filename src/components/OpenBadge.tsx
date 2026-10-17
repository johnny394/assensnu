"use client";

import { useEffect, useState } from "react";
import { copenhagenNow, describeStatus, openStatus } from "@/lib/hours";
import type { Place } from "@/lib/types";

// Regnes ud i browseren, så "åben nu" altid passer, selv om siden er cachet
export function useNow(intervalMs = 60_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function OpenBadge({ place, now }: { place: Pick<Place, "hours" | "closedToday">; now: Date | null }) {
  if (!now) return <span className="inline-block h-6" />;
  const status = openStatus(place, now);
  const styles = {
    open: "bg-emerald-100 text-emerald-800",
    closed: "bg-stone-200 text-stone-700",
    unknown: "bg-amber-50 text-amber-800",
  }[status.state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {status.state === "open" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
      {describeStatus(status, copenhagenNow(now).day)}
    </span>
  );
}

export function LiveOpenBadge({ place }: { place: Pick<Place, "hours" | "closedToday"> }) {
  const now = useNow();
  return <OpenBadge place={place} now={now} />;
}
