"use client";

import { useEffect, useState } from "react";

// Henter data igen med få sekunders mellemrum, så siden opdaterer sig selv
export function usePolling<T>(url: string, initial: T, intervalMs = 5000): T {
  const [data, setData] = useState(initial);
  useEffect(() => {
    let alive = true;
    let latest = 0;
    const load = async () => {
      // Kun det nyeste svar tæller, så et gammelt svar ikke kan rulle skærmen tilbage
      const id = ++latest;
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      const body = res?.ok ? await res.json() : null;
      if (alive && body && id === latest) setData(body);
    };
    load();
    const id = setInterval(load, intervalMs);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [url, intervalMs]);
  return data;
}
