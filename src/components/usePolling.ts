"use client";

import { useEffect, useState } from "react";

// Henter data igen med få sekunders mellemrum, så siden opdaterer sig selv
export function usePolling<T>(url: string, initial: T, intervalMs = 5000): T {
  const [data, setData] = useState(initial);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (alive && res?.ok) setData(await res.json());
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
