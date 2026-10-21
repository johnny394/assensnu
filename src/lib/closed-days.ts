import type { Result } from "./orders";
import type { ClosedPeriod } from "./types";

// Lukkedage sat på forhånd: juleaften, vinterferie og den slags. Datoer som "2026-12-24".

export const MAX_CLOSED_PERIODS = 20;

export const isClosedOn = (periods: ClosedPeriod[] | undefined, iso: string) => !!periods?.some((p) => p.from <= iso && iso <= p.to);

// Den periode, der gælder nu eller starter inden for de næste dage. Til kunderne på stedets side.
export function nextClosed(periods: ClosedPeriod[] | undefined, today: string, withinDays = 14): ClosedPeriod | undefined {
  const limit = addDays(today, withinDays);
  return periods?.filter((p) => p.to >= today && p.from <= limit).sort((a, b) => a.from.localeCompare(b.from))[0];
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// Tjekker restaurantens liste. Gamle perioder smides væk.
export function cleanClosedDays(input: unknown, today: string): Result<ClosedPeriod[]> {
  if (!Array.isArray(input)) return { ok: false, error: "Noget gik galt. Prøv igen." };
  const list: ClosedPeriod[] = [];
  for (const raw of input as { from?: unknown; to?: unknown; note?: unknown }[]) {
    const from = raw?.from;
    const to = raw?.to ?? raw?.from;
    if (!isDate(from) || !isDate(to)) return { ok: false, error: "Vælg en dato." };
    if (to < from) return { ok: false, error: "Sidste lukkedag skal være samme dag eller senere end den første." };
    if (to > addDays(from, 366)) return { ok: false, error: "Det er længere end et år. Vælg en kortere periode." };
    if (to < today) continue;
    const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 40) : "";
    list.push({ from, to, ...(note && { note }) });
  }
  if (list.length > MAX_CLOSED_PERIODS) return { ok: false, error: `Der kan højst stå ${MAX_CLOSED_PERIODS} lukkeperioder.` };
  return { ok: true, value: list.sort((a, b) => a.from.localeCompare(b.from)) };
}

// Dem, der er tilbage, når de gamle er væk
export const currentClosed = (periods: ClosedPeriod[] | null | undefined, today: string) => (periods ?? []).filter((p) => p.to >= today);

const MONTHS: Record<"da" | "en" | "de", string[]> = {
  da: ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
};

// "24. december" eller "24.–26. december" eller "30. december–2. januar"
export function periodText(p: ClosedPeriod, lang: "da" | "en" | "de" = "da") {
  const [, fm, fd] = p.from.split("-").map(Number);
  const [, tm, td] = p.to.split("-").map(Number);
  const dot = lang === "en" ? "" : ".";
  const day = (d: number, m: number) => `${d}${dot} ${MONTHS[lang][m - 1]}`;
  if (p.from === p.to) return day(fd, fm);
  if (fm === tm) return `${fd}${dot}–${day(td, tm)}`;
  return `${day(fd, fm)}–${day(td, tm)}`;
}

// Helligdage, man tit holder lukket. Den næste gang de kommer.
const HOLIDAYS: [string, string][] = [
  ["12-24", "Juleaften"],
  ["12-25", "1. juledag"],
  ["12-26", "2. juledag"],
  ["12-31", "Nytårsaften"],
  ["01-01", "Nytårsdag"],
];
export function upcomingHolidays(today: string): ClosedPeriod[] {
  const year = Number(today.slice(0, 4));
  return HOLIDAYS.map(([md, note]) => {
    const date = `${year}-${md}` >= today ? `${year}-${md}` : `${year + 1}-${md}`;
    return { from: date, to: date, note };
  }).sort((a, b) => a.from.localeCompare(b.from));
}
