import type { AdminPlace } from "./admin";
import { copenhagenNow, todayInCopenhagen, toTime, WEEKDAYS } from "./hours";
import type { Booking, Order, OrderDelivery, OrderLine } from "./types";

// Data til et dashboard (Excel, Power BI, Google Sheets). Uden navn, telefon, adresse og besked,
// så filerne kan deles uden at bryde privatlivspolitikken.

export type ExportOrder = Pick<Order, "id" | "number" | "placeSlug" | "placeName" | "pickup" | "total" | "status" | "readyAt" | "createdAt"> & {
  delivery?: Omit<OrderDelivery, "address">;
  lines: (Omit<OrderLine, "person"> & { shared?: boolean })[]; // shared: retten var til en anden i en fællesbestilling
};
export type ExportBooking = Pick<Booking, "id" | "placeSlug" | "placeName" | "date" | "time" | "guests" | "status" | "createdAt">;

// Tager kun det med, der må stå i filen. Både ordrer fra hukommelsen og fra Supabase går igennem her.
type OrderIn = Omit<ExportOrder, "delivery" | "lines"> & { delivery?: Partial<OrderDelivery> | null; lines: (Omit<OrderLine, "person"> & { person?: string; shared?: boolean })[] };
export function withoutCustomer(o: OrderIn): ExportOrder {
  const d = o.delivery;
  return {
    id: o.id,
    number: o.number,
    placeSlug: o.placeSlug,
    placeName: o.placeName,
    pickup: o.pickup,
    total: Number(o.total),
    status: o.status,
    readyAt: o.readyAt,
    createdAt: o.createdAt,
    delivery: d ? { postcode: d.postcode ?? "", fee: Number(d.fee ?? 0), harbour: d.harbour, camping: d.camping } : undefined,
    lines: (o.lines ?? []).map((l) => ({ itemId: l.itemId, name: l.name, price: l.price, quantity: l.quantity, size: l.size, extras: l.extras, halfPrice: l.halfPrice, shared: Boolean(l.person || l.shared) })),
  };
}

export const bookingWithoutCustomer = (b: ExportBooking): ExportBooking => ({ id: b.id, placeSlug: b.placeSlug, placeName: b.placeName, date: b.date, time: b.time, guests: b.guests, status: b.status, createdAt: b.createdAt });

type Cell = string | number | boolean | null | undefined;

// Semikolon, komma som decimaltegn og BOM forrest, så dansk Excel åbner filen rigtigt
export function toCsv(rows: Cell[][]) {
  const cell = (v: Cell) => {
    if (typeof v === "number") return String(v).replace(".", ",");
    const text = v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "Ja" : "Nej") : v;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}

const STATUS: Record<string, string> = { new: "Ny", accepted: "Accepteret", ready: "Klar", picked_up: "Hentet", rejected: "Afvist" };
const BOOKING_STATUS: Record<string, string> = { requested: "Venter på svar", confirmed: "Bekræftet", declined: "Afvist", suggested: "Andet tidspunkt foreslået" };

const kind = (o: ExportOrder) => (!o.delivery ? "Afhentning" : o.delivery.harbour ? "Til båden" : o.delivery.camping ? "Til campingpladsen" : "Levering");

// Dato, tid, ugedag og time i dansk tid
function when(iso: string) {
  const date = new Date(iso);
  const { day, minutes } = copenhagenNow(date);
  const today = todayInCopenhagen(date);
  return [today, toTime(minutes), WEEKDAYS[day], Math.floor(minutes / 60), today.slice(0, 7)];
}
const WHEN = ["Dato", "Tid", "Ugedag", "Time", "Måned"];

// Én række pr. bestilling
export function ordersSheet(orders: ExportOrder[], city: string) {
  return [
    ["Ordre-id", "Ordrenr.", "By", "Sted-id", "Sted", ...WHEN, "Status", "Tæller med", "Måde", "Postnummer", "Bestilt til", "Klar kl.", "Antal retter", "Mad (kr.)", "Levering (kr.)", "I alt (kr.)", "Fællesbestilling", "Retter til halv pris"],
    ...orders.map((o) => {
      const fee = o.delivery?.fee ?? 0;
      return [
        o.id,
        o.number,
        city,
        o.placeSlug,
        o.placeName,
        ...when(o.createdAt),
        STATUS[o.status] ?? o.status,
        o.status !== "rejected",
        kind(o),
        o.delivery && !o.delivery.harbour && !o.delivery.camping ? o.delivery.postcode : "",
        o.pickup === "asap" ? "Hurtigst muligt" : o.pickup,
        o.readyAt ?? "",
        o.lines.reduce((s, l) => s + l.quantity, 0),
        o.total - fee,
        fee,
        o.total,
        o.lines.some((l) => l.shared),
        o.lines.filter((l) => l.halfPrice).reduce((s, l) => s + l.quantity, 0),
      ];
    }),
  ];
}

// Én række pr. ret i en bestilling. Godt til "hvad sælger bedst".
export function dishesSheet(orders: ExportOrder[], city: string) {
  return [
    ["Ordre-id", "Ordrenr.", "By", "Sted-id", "Sted", ...WHEN, "Status", "Tæller med", "Måde", "Ret", "Størrelse", "Tilvalg", "Antal", "Stykpris (kr.)", "Beløb (kr.)", "Halv pris"],
    ...orders.flatMap((o) =>
      o.lines.map((l) => [o.id, o.number, city, o.placeSlug, o.placeName, ...when(o.createdAt), STATUS[o.status] ?? o.status, o.status !== "rejected", kind(o), l.name, l.size ?? "", (l.extras ?? []).join(", "), l.quantity, l.price, l.price * l.quantity, Boolean(l.halfPrice)]),
    ),
  ];
}

// Én række pr. spisested
export function placesSheet(places: AdminPlace[], city: string) {
  return [
    ["Sted-id", "Sted", "By", "Adresse", "Køkken", "Har kode til panelet", "Synlig", "Tager imod bestillinger", "Tager imod bordbooking", "Leverer", "Til båden", "Til campingpladsen", "Takeaway", "Spis her", "Retter på menuen", "Åbne dage om ugen"],
    ...places.map((p) => [
      p.slug,
      p.name,
      city,
      p.address,
      p.cuisines.join(", "),
      p.hasCode,
      p.published,
      p.acceptsOrders,
      p.acceptsBookings,
      Boolean(p.delivery),
      Boolean(p.delivery?.harbour),
      Boolean(p.delivery?.camping),
      p.takeaway ?? "",
      p.dineIn ?? "",
      p.menu.reduce((s, c) => s + c.items.length, 0),
      new Set(p.hours.map((h) => h.day)).size,
    ]),
  ];
}

// Én række pr. bordbooking
export function bookingsSheet(bookings: ExportBooking[], city: string) {
  return [
    ["Booking-id", "By", "Sted-id", "Sted", "Sendt dato", "Sendt tid", "Bord dato", "Bord tid", "Ugedag", "Gæster", "Status"],
    ...bookings.map((b) => {
      const [sentDate, sentTime] = when(b.createdAt);
      const day = (new Date(`${b.date}T12:00:00Z`).getUTCDay() + 6) % 7;
      return [b.id, city, b.placeSlug, b.placeName, sentDate, sentTime, b.date, b.time, WEEKDAYS[day], b.guests, BOOKING_STATUS[b.status] ?? b.status];
    }),
  ];
}
