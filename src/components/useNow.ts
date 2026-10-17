"use client";

import { useEffect, useState } from "react";

// Tiden regnes ud i browseren, så "åben nu" altid passer. Null indtil siden er indlæst.
export function useNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
