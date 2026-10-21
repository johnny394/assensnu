import { addDays } from "./closed-days";
import { todayInCopenhagen } from "./hours";

// Tal til restauranten og til Johnny: ordrer, omsætning, borde og nye følgere pr. uge eller måned.

export type OrderFact = { placeSlug: string; placeName: string; createdAt: string; status: string; total: number; lines: { name: string; quantity: number }[] };
export type BookingFact = { placeSlug: string; createdAt: string; status: string; guests: number };

// Ordrer, der blev til noget. Afviste tæller ikke.
const counts = (o: { status: string }) => o.status !== "rejected";

// Mandagen i den uge, datoen ligger i
export function weekStart(isoDate: string) {
  const day = (new Date(`${isoDate}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(isoDate, -day);
}

export type Week = { start: string; orders: number; revenue: number; bookings: number; guests: number; newFollowers: number };

export function weeklyStats(data: { orders: OrderFact[]; bookings: BookingFact[]; followerDates: string[] }, now = new Date(), weeks = 4): Week[] {
  const thisWeek = weekStart(todayInCopenhagen(now));
  const list: Week[] = Array.from({ length: weeks }, (_, i) => ({ start: addDays(thisWeek, -7 * i), orders: 0, revenue: 0, bookings: 0, guests: 0, newFollowers: 0 }));
  const find = (iso: string) => list.find((w) => w.start === weekStart(todayInCopenhagen(new Date(iso))));
  for (const o of data.orders.filter(counts)) {
    const w = find(o.createdAt);
    if (w) {
      w.orders++;
      w.revenue += o.total;
    }
  }
  for (const b of data.bookings.filter((b) => b.status !== "declined")) {
    const w = find(b.createdAt);
    if (w) {
      w.bookings++;
      w.guests += b.guests;
    }
  }
  for (const f of data.followerDates) {
    const w = find(f);
    if (w) w.newFollowers++;
  }
  return list;
}

// De retter, der blev bestilt mest siden since
export function topDishes(orders: OrderFact[], since: string, max = 5) {
  const count = new Map<string, number>();
  for (const o of orders.filter((o) => counts(o) && o.createdAt >= since)) for (const l of o.lines) count.set(l.name, (count.get(l.name) ?? 0) + l.quantity);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "da")).slice(0, max).map(([name, quantity]) => ({ name, quantity }));
}

export type PlaceMonth = { placeSlug: string; placeName: string; orders: number; revenue: number; rejected: number };

// Til fakturering: alle steder i én måned ("2026-10")
export function monthByPlace(orders: OrderFact[], month: string): PlaceMonth[] {
  const rows = new Map<string, PlaceMonth>();
  for (const o of orders) {
    if (todayInCopenhagen(new Date(o.createdAt)).slice(0, 7) !== month) continue;
    const r = rows.get(o.placeSlug) ?? { placeSlug: o.placeSlug, placeName: o.placeName, orders: 0, revenue: 0, rejected: 0 };
    if (counts(o)) {
      r.orders++;
      r.revenue += o.total;
    } else r.rejected++;
    rows.set(o.placeSlug, r);
  }
  return [...rows.values()].sort((a, b) => b.orders - a.orders || a.placeName.localeCompare(b.placeName, "da"));
}

// Første dag i måneden, i dansk tid, som ISO-tidspunkt. Bruges til at hente lidt for meget, så tidszonen ikke snyder.
export const monthStartIso = (month: string) => new Date(`${month}-01T00:00:00Z`).getTime() - 2 * 3600_000;
