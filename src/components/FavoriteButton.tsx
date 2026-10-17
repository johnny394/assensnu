"use client";

import { useFavorites } from "./useFavorites";

export function FavoriteButton({ slug, name }: { slug: string; name: string }) {
  const { favorites, toggle } = useFavorites();
  const on = favorites.includes(slug);
  return (
    <button
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={on ? `Fjern ${name} fra favoritter` : `Gem ${name} som favorit`}
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface text-signal shadow-card hover:shadow-lift"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    </button>
  );
}
