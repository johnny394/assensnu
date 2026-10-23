"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { RememberedOrder } from "@/lib/badges";
import { isHensynId, type HensynId } from "@/lib/hensyn";

// Små ting, telefonen husker: kundens hensyn, de seneste bestillinger og beskeden til køkkenet.
// Det bliver på telefonen og sendes ikke til os. Virker det ikke (privat vindue), glemmes det bare.

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = fallback;
  try {
    value = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {}
  cache.set(key, { raw, value });
  return value;
}

export function writeStored<T>(key: string, value: T | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  listeners.forEach((l) => l());
}

export function readStored<T>(key: string, fallback: T): T {
  return typeof window === "undefined" ? fallback : read(key, fallback);
}

function useStored<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback((next: T | null) => writeStored(key, next), [key]);
  return [value, set] as const;
}

const NONE: HensynId[] = [];
const HENSYN_KEY = "assensnu:hensyn";
export function useHensyn() {
  const [raw, set] = useStored<unknown>(HENSYN_KEY, NONE);
  const hensyn = Array.isArray(raw) ? (raw.filter(isHensynId) as HensynId[]) : NONE;
  const toggle = useCallback(
    (id: HensynId) => {
      const now = readStored<unknown>(HENSYN_KEY, NONE);
      const list = Array.isArray(now) ? now.filter(isHensynId) : [];
      set(list.includes(id) ? list.filter((h) => h !== id) : [...list, id]);
    },
    [set],
  );
  return { hensyn, toggle };
}

const NO_ORDERS: RememberedOrder[] = [];
const ORDERS_KEY = "assensnu:mine-ordrer";
export const useMyOrders = () => useStored<RememberedOrder[]>(ORDERS_KEY, NO_ORDERS)[0];
export const readMyOrders = () => readStored<RememberedOrder[]>(ORDERS_KEY, NO_ORDERS);

/** Husker en bestilling til mærkerne. Gør ingenting, hvis den allerede er husket. Giver true, hvis den er ny. */
export function rememberOrder(order: RememberedOrder): boolean {
  const list = readStored<RememberedOrder[]>(ORDERS_KEY, NO_ORDERS);
  if (!Array.isArray(list) || list.some((o) => o.id === order.id)) return false;
  // De seneste 200 er nok til mærkerne
  writeStored(ORDERS_KEY, [...list, order].slice(-200));
  return true;
}

// Beskeden til køkkenet, fx fra allergidetektiven. Kassen fylder den ind og glemmer den, når ordren er sendt.
export const noteKey = (slug: string) => `assensnu:besked:${slug}`;
export function addToNote(slug: string, text: string) {
  const now = readStored<string>(noteKey(slug), "");
  if (typeof now === "string" && now.includes(text)) return;
  writeStored(noteKey(slug), typeof now === "string" && now ? `${now} ${text}` : text);
}
