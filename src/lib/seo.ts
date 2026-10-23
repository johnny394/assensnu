import { ARTICLES } from "./articles";
import { BRAND_DOMAIN } from "./site";
import type { Place } from "./types";

type Entry = { url: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number };

// Siderne, Google skal kende. bynu.dk har byvælgeren og artiklerne, hver by har sine spisesteder.
// Prøvestedet og steder med "Kommer snart" er ikke med, for dem kan kunderne ikke åbne.
export function sitemapEntries(host: string, places: Place[]): Entry[] {
  const base = `https://${host}`;
  if (host === BRAND_DOMAIN) {
    return [
      { url: base, changeFrequency: "weekly", priority: 1 },
      ...ARTICLES.map((a) => ({ url: `${base}/artikel/${a.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ];
  }
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/tilbud`, changeFrequency: "daily", priority: 0.7 },
    ...places.filter((p) => p.member && !p.demo).map((p) => ({ url: `${base}/sted/${p.slug}`, changeFrequency: "daily" as const, priority: 0.9 })),
    { url: `${base}/privatliv`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/handelsbetingelser`, changeFrequency: "monthly", priority: 0.2 },
  ];
}

// Panelet, admin og kundernes egne ordrer skal ikke findes på Google
export const HIDDEN_PATHS = ["/panel", "/admin", "/api/", "/ordre", "/booking", "/faelles", "/status", "/skilt"];

export const hostOf = (h: Headers) => (h.get("x-forwarded-host") ?? h.get("host") ?? BRAND_DOMAIN).split(":")[0];
