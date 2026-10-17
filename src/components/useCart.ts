"use client";

import { useCallback, useSyncExternalStore } from "react";

// Kurven gemmes på telefonen for hvert sted: { retId: antal }
export type Cart = Record<string, number>;

const key = (slug: string) => `assensnu:kurv:${slug}`;
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; cart: Cart }>();
const EMPTY: Cart = {};

function readCart(slug: string): Cart {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key(slug));
  } catch {}
  const hit = cache.get(slug);
  if (hit && hit.raw === raw) return hit.cart;
  let cart: Cart = EMPTY;
  try {
    cart = raw ? JSON.parse(raw) : EMPTY;
  } catch {}
  cache.set(slug, { raw, cart });
  return cart;
}

function writeCart(slug: string, cart: Cart) {
  try {
    if (Object.keys(cart).length) localStorage.setItem(key(slug), JSON.stringify(cart));
    else localStorage.removeItem(key(slug));
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCart(slug: string) {
  const cart = useSyncExternalStore(subscribe, () => readCart(slug), () => EMPTY);
  const change = useCallback(
    (itemId: string, delta: number) => {
      const next = { ...readCart(slug) };
      const quantity = (next[itemId] ?? 0) + delta;
      if (quantity > 0) next[itemId] = Math.min(quantity, 20);
      else delete next[itemId];
      writeCart(slug, next);
    },
    [slug],
  );
  const clear = useCallback(() => writeCart(slug, {}), [slug]);
  return { cart, change, clear };
}
