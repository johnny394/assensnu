"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "assensnu:favoritter";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

// Favoritter gemmes kun på telefonen, så man ikke behøver en profil
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => setFavorites(read()), []);
  const toggle = useCallback((slug: string) => {
    const next = read().includes(slug) ? read().filter((s) => s !== slug) : [...read(), slug];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setFavorites(next);
  }, []);
  return { favorites, toggle };
}
