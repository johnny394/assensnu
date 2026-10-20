import { todayInCopenhagen } from "./hours";
import type { PlaceNews } from "./types";

// Det, restauranten ændrer fra time til time: hvor travlt de har, og dagens ret eller tilbud.

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

// Dagens ret og tilbud gælder kun den dag, de er skrevet
export function todaysNews(text: string | null | undefined, sentAt: string | null | undefined, now = new Date()): PlaceNews | undefined {
  if (!text || !sentAt) return undefined;
  return todayInCopenhagen(new Date(sentAt)) === todayInCopenhagen(now) ? { text, sentAt } : undefined;
}
