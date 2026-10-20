import { todayInCopenhagen } from "./hours";
import type { MenuCategory, MenuItem, Place, PlaceNews } from "./types";

// Det, restauranten ændrer fra time til time: hvor travlt de har, og dagens tilbud.

// "Travlt"-knappen slukker af sig selv efter to timer, så et glemt tryk ikke hænger ved til i morgen
export const BUSY_HOURS = 2;
export const WAIT_STEPS = [
  { extra: 0, label: "Normal" },
  { extra: 15, label: "Travlt" },
  { extra: 30, label: "Meget travlt" },
  { extra: 45, label: "Fuldt hus" },
] as const;

export const busyUntilFrom = (extra: number, now = new Date()) => (extra > 0 ? new Date(now.getTime() + BUSY_HOURS * 3600_000).toISOString() : null);

// "2026-10-20T17:40:00Z" -> "19:40" i dansk tid
export const clockTime = (iso: string) =>
  new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).replace(".", ":");

// Den ekstra ventetid, der gælder lige nu. Uden sluttid (gammel database) gælder den, til den slås fra.
export function activeWait(extra: number, until: string | null, now = new Date()): { extraWaitMinutes: number; busyUntil?: string } {
  if (!extra) return { extraWaitMinutes: 0 };
  if (!until) return { extraWaitMinutes: extra };
  if (new Date(until).getTime() <= now.getTime()) return { extraWaitMinutes: 0 };
  return { extraWaitMinutes: extra, busyUntil: clockTime(until) };
}

export const NEWS_MAX = 160;

export function cleanNews(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.replace(/\s+/g, " ").trim();
  return text && text.length <= NEWS_MAX ? text : null;
}

// Pris på dagens tilbud i hele kroner. Tom betyder, at den ikke kan bestilles.
export function cleanNewsPrice(input: unknown): number | null | undefined {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  return Number.isInteger(n) && n > 0 && n <= 5000 ? n : undefined;
}

// Normalprisen vises kun, når den er højere end tilbudsprisen
export const cleanWasPrice = (was: number | null | undefined, price: number | null | undefined) => (was && price && was > price ? was : null);

// Dagens tilbud gælder kun den dag, det er skrevet
export function todaysNews(
  text: string | null | undefined,
  sentAt: string | null | undefined,
  prices: { price?: number | null; wasPrice?: number | null } = {},
  now = new Date(),
): PlaceNews | undefined {
  if (!text || !sentAt) return undefined;
  if (todayInCopenhagen(new Date(sentAt)) !== todayInCopenhagen(now)) return undefined;
  const wasPrice = cleanWasPrice(prices.wasPrice, prices.price);
  return { text, sentAt, ...(prices.price && { price: prices.price }), ...(wasPrice && { wasPrice }) };
}

// Dagens tilbud med pris som en ret, der kan lægges i kurven. Id'et skifter hver dag,
// så en kurv fra i går ikke kan bestille gårsdagens tilbud.
export function todaysDish(news: PlaceNews | undefined): MenuItem | null {
  if (!news?.price) return null;
  const name = news.text.replace(/^dagens (ret|tilbud)\s*[:\-–]\s*/i, "") || news.text;
  return { id: `dagens-ret-${todayInCopenhagen(new Date(news.sentAt))}`, name, price: news.price };
}

// Menukortet, som kunden kan bestille fra: dagens tilbud øverst, hvis der er en
export function orderableMenu(place: Pick<Place, "menu" | "news">): MenuCategory[] {
  const dish = todaysDish(place.news);
  return dish ? [{ name: "Dagens tilbud", items: [dish] }, ...place.menu] : place.menu;
}
