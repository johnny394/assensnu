import type { Result } from "./orders";
import type { Place } from "./types";

// Events i byen: koncerter, markeder, festivaler. Johnny skriver dem ind i sit panel.
export type AssensEvent = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM", når det starter
  venue: string; // fx Tobaksgaarden
  text?: string;
  link?: string; // billetter eller mere info
};

export const EVENT_TEXT_MAX = 400;
// Bordbooking kan vælges 14 dage frem, som i bookingformularen
export const BOOKING_DAYS = 14;

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, max) : "");

export function cleanEvent(body: unknown, today: string): Result<Omit<AssensEvent, "id">> {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = clean(b.title, 80);
  const venue = clean(b.venue, 80);
  const date = typeof b.date === "string" ? b.date : "";
  const time = typeof b.time === "string" ? b.time : "";
  const text = typeof b.text === "string" ? b.text.trim().slice(0, EVENT_TEXT_MAX) : "";
  let link = clean(b.link, 300);
  if (!title) return { ok: false, error: "Skriv hvad det er, fx Koncert med Lis Sørensen." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return { ok: false, error: "Vælg en dag fra i dag og frem." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "Skriv hvornår det starter, fx 20:00." };
  if (!venue) return { ok: false, error: "Skriv hvor det er, fx Tobaksgaarden." };
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(link)) return { ok: false, error: "Linket ser forkert ud. Kopiér det fra billetsiden." };
  return { ok: true, value: { title, date, time, venue, text: text || undefined, link: link || undefined } };
}

// Kommende events, de næste først
export const upcoming = (events: AssensEvent[], today: string) =>
  events.filter((e) => e.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// Mandag = 0, som i resten af appen
export const weekdayOf = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// De tider, man kan bede om bord. Sidste bord en time før lukketid.
export function bookingTimes(place: Pick<Place, "hours">, date: string): string[] {
  const times: string[] = [];
  for (const p of place.hours.filter((h) => h.day === weekdayOf(date))) {
    const open = toMinutes(p.open);
    const close = toMinutes(p.close) <= open ? 24 * 60 : toMinutes(p.close);
    for (let t = Math.ceil(open / 30) * 30; t <= close - 60; t += 30) times.push(toTime(t));
  }
  return times;
}

// Har stedet åbent på det tidspunkt den dag?
function openAt(place: Pick<Place, "hours">, date: string, minutes: number) {
  return place.hours.some((p) => {
    if (p.day !== weekdayOf(date)) return false;
    const open = toMinutes(p.open);
    const close = toMinutes(p.close) <= open ? 24 * 60 : toMinutes(p.close);
    return minutes >= open && minutes < close;
  });
}

export type EatBefore = {
  place: Place;
  bookTime: string | null; // bord kl. …, så man når det
  takeawayTime: string | null; // mad klar kl. …, kun samme dag
};

// Spis før koncerten: steder, der har åbent i timerne før, med et bord eller mad klar i god tid.
// Bord 1½–2½ time før start, takeaway klar senest 45 minutter før.
export function eatBefore(places: Place[], event: AssensEvent, today: string): EatBefore[] {
  if (event.date < today) return [];
  const start = toMinutes(event.time);
  const bookable = event.date < addDays(today, BOOKING_DAYS);
  const list: EatBefore[] = [];
  for (const place of places) {
    if (!place.member) continue;
    if (event.date === today && place.closedToday) continue;
    const times = bookable && place.acceptsBookings ? bookingTimes(place, event.date) : [];
    const bookTime = times.filter((t) => toMinutes(t) >= start - 150 && toMinutes(t) <= start - 90).pop() ?? null;
    const pickup = Math.floor((start - 45) / 15) * 15;
    const takeawayTime = event.date === today && place.acceptsOrders && openAt(place, event.date, pickup) ? toTime(pickup) : null;
    const openBefore = openAt(place, event.date, start - 120) || openAt(place, event.date, start - 60);
    if (bookTime || takeawayTime || (openBefore && place.phone)) list.push({ place, bookTime, takeawayTime });
  }
  // Dem, man kan booke eller bestille hos, først
  return list.sort((a, b) => Number(!!b.bookTime) + Number(!!b.takeawayTime) - Number(!!a.bookTime) - Number(!!a.takeawayTime));
}
