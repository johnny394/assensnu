import { pickupOptions } from "./hours";
import type { NewBooking, NewOrder } from "./store/types";
import type { Place } from "./types";

export type OrderInput = {
  items: { itemId: string; quantity: number }[];
  name: string;
  phone: string;
  pickup: string;
  note?: string;
  delivery?: { address?: string; postcode?: string } | null;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function cleanPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "").replace(/^45(?=\d{8}$)/, "");
  return /^\d{8}$/.test(digits) ? digits.replace(/(\d{2})(?=\d)/g, "$1 ") : null;
}

// Tjekker en bestilling og regner prisen ud fra menuen, så kunden ikke selv kan sætte prisen
export function buildOrder(place: Place, input: OrderInput, now = new Date()): Result<NewOrder> {
  if (!place.acceptsOrders) return { ok: false, error: `${place.name} tager ikke imod bestillinger her lige nu.` };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Skriv dit navn, så restauranten ved, hvem der henter." };
  const phone = cleanPhone(input.phone ?? "");
  if (!phone) return { ok: false, error: "Skriv dit telefonnummer med 8 cifre." };

  const menu = new Map(place.menu.flatMap((c) => c.items).map((i) => [i.id, i]));
  const lines = [];
  for (const { itemId, quantity } of input.items ?? []) {
    const item = menu.get(itemId);
    if (!item) return { ok: false, error: "En af retterne findes ikke længere. Gå tilbage og prøv igen." };
    if (item.soldOut) return { ok: false, error: `${item.name} er desværre udsolgt.` };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { ok: false, error: "Antal skal være mellem 1 og 20." };
    lines.push({ itemId, name: item.name, price: item.price, quantity });
  }
  if (lines.length === 0) return { ok: false, error: "Kurven er tom." };

  const food = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  let delivery: NewOrder["delivery"];
  if (input.delivery) {
    const d = place.delivery;
    if (!d) return { ok: false, error: `${place.name} leverer ikke. Vælg at hente maden.` };
    const address = input.delivery.address?.trim().slice(0, 120) ?? "";
    const postcode = input.delivery.postcode?.trim() ?? "";
    if (!address) return { ok: false, error: "Skriv din adresse, så de ved, hvor de skal køre hen." };
    if (!d.postcodes.includes(postcode)) return { ok: false, error: `${place.name} kører kun ud til ${d.postcodes.join(", ")}.` };
    if (food < d.minimum) return { ok: false, error: `Levering kræver, at du bestiller for mindst ${d.minimum} kr.` };
    delivery = { address, postcode, fee: d.fee };
  }

  const options = pickupOptions(place, now);
  const pickupOk = input.pickup === "asap" ? options.asapMinutes !== null : options.slots.includes(input.pickup);
  if (!pickupOk) return { ok: false, error: "Det tidspunkt kan ikke vælges længere. Vælg et nyt." };

  return {
    ok: true,
    value: {
      placeSlug: place.slug,
      placeName: place.name,
      customerName: name.slice(0, 80),
      customerPhone: phone,
      pickup: input.pickup,
      note: input.note?.trim().slice(0, 300) || undefined,
      lines,
      ...(delivery && { delivery }),
      total: food + (delivery?.fee ?? 0),
    },
  };
}

export type BookingInput = { date: string; time: string; guests: number; name: string; phone: string; note?: string };

export function buildBooking(place: Place, input: BookingInput, today: string): Result<NewBooking> {
  if (!place.acceptsBookings) return { ok: false, error: `${place.name} tager ikke imod bordforespørgsler her endnu.` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "") || input.date < today) return { ok: false, error: "Vælg en dato fra i dag og frem." };
  if (!/^\d{2}:\d{2}$/.test(input.time ?? "")) return { ok: false, error: "Vælg et tidspunkt." };
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 50) return { ok: false, error: "Vælg hvor mange I er." };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Skriv dit navn." };
  const phone = cleanPhone(input.phone ?? "");
  if (!phone) return { ok: false, error: "Skriv dit telefonnummer med 8 cifre." };
  return {
    ok: true,
    value: {
      placeSlug: place.slug,
      placeName: place.name,
      customerName: name.slice(0, 80),
      customerPhone: phone,
      date: input.date,
      time: input.time,
      guests: input.guests,
      note: input.note?.trim().slice(0, 300) || undefined,
    },
  };
}
