import { isClosedOn } from "./closed-days";
import { pickupOptions } from "./hours";
import { priceChoice } from "./menu-options";
import type { NewBooking, NewOrder } from "./store/types";
import type { Place } from "./types";

export type OrderInput = {
  items: { itemId: string; quantity: number; size?: string; extras?: string[]; person?: string }[];
  name: string;
  phone: string;
  pickup: string;
  note?: string;
  delivery?: { address?: string; postcode?: string; harbour?: "jetty" | "office"; jetty?: string; boat?: string; camping?: "pitch" | "reception"; pitch?: string } | null;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Danske numre gemmes som "12 34 56 78". Turister kan skrive et udenlandsk nummer med + foran, fx +49 151 2345678.
export function cleanPhone(phone: string): string | null {
  const abroad = /^\s*(\+|00)/.test(phone);
  const digits = phone.replace(/\D/g, "").replace(/^00/, "").replace(/^45(?=\d{8}$)/, "");
  if (/^\d{8}$/.test(digits)) return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
  return abroad && /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

// Assens Havn. Lystsejlerne skriver bro og båd i stedet for en adresse.
export const HARBOUR_POSTCODE = "5610";
function harbourSpot(d: { harbour?: string; jetty?: string; boat?: string }): Result<string> {
  if (d.harbour === "office") return { ok: true, value: "Havnekontoret" };
  const jetty = d.jetty?.trim().replace(/^bro\s*/i, "").slice(0, 10) ?? "";
  const boat = d.boat?.trim().slice(0, 40) ?? "";
  if (!jetty) return { ok: false, error: "Skriv hvilken bro, I ligger ved, fx 3." };
  if (!boat) return { ok: false, error: "Skriv bådens navn, så de kan finde jer." };
  return { ok: true, value: `Bro ${jetty}, båd ${boat}` };
}

// Campingpladsen. Gæsterne skriver pladsnummeret, eller henter i receptionen.
export const CAMPSITE = "CityCamp Assens Strand";
function campingSpot(d: { camping?: string; pitch?: string }): Result<string> {
  if (d.camping === "reception") return { ok: true, value: `Receptionen på ${CAMPSITE}` };
  const pitch = d.pitch?.trim().replace(/^plads\s*/i, "").slice(0, 20) ?? "";
  if (!pitch) return { ok: false, error: "Skriv nummeret på jeres plads, fx 112." };
  return { ok: true, value: `${CAMPSITE}, plads ${pitch}` };
}

// Tjekker en bestilling og regner prisen ud fra menuen, så kunden ikke selv kan sætte prisen
export function buildOrder(place: Place, input: OrderInput, now = new Date()): Result<NewOrder> {
  if (!place.acceptsOrders) return { ok: false, error: `${place.name} tager ikke imod bestillinger her lige nu.` };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Skriv dit navn, så restauranten ved, hvem der henter." };
  const phone = cleanPhone(input.phone ?? "");
  if (!phone) return { ok: false, error: "Skriv dit telefonnummer med 8 cifre. Et udenlandsk nummer skal starte med +." };

  const lines = [];
  for (const { itemId, quantity, size, extras, person } of (input.items ?? []).slice(0, 200)) {
    const priced = priceChoice(place, {
      itemId: String(itemId),
      size: typeof size === "string" ? size : undefined,
      extras: Array.isArray(extras) ? extras.filter((e) => typeof e === "string") : undefined,
    });
    if (!priced.ok) return priced;
    const { item, ...line } = priced.value;
    if (item.soldOut) return { ok: false, error: `${item.name} er desværre udsolgt.` };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { ok: false, error: "Antal skal være mellem 1 og 20." };
    const who = typeof person === "string" ? person.trim().slice(0, 40) : "";
    lines.push({ ...line, quantity, ...(who && { person: who }) });
  }
  if (lines.length === 0) return { ok: false, error: "Kurven er tom." };

  const food = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  let delivery: NewOrder["delivery"];
  if (input.delivery) {
    const d = place.delivery;
    if (!d) return { ok: false, error: `${place.name} leverer ikke. Vælg at hente maden.` };
    if (input.delivery.camping) {
      if (!d.camping) return { ok: false, error: `${place.name} kommer ikke ud på ${CAMPSITE}. Vælg at hente maden.` };
      const where = campingSpot(input.delivery);
      if (!where.ok) return where;
      if (food < d.minimum) return { ok: false, error: `Levering kræver, at du bestiller for mindst ${d.minimum} kr.` };
      delivery = { address: where.value, postcode: HARBOUR_POSTCODE, fee: d.fee, camping: true };
    } else if (input.delivery.harbour) {
      if (!d.harbour) return { ok: false, error: `${place.name} kommer ikke ned i havnen. Vælg at hente maden.` };
      const where = harbourSpot(input.delivery);
      if (!where.ok) return where;
      if (food < d.minimum) return { ok: false, error: `Levering kræver, at du bestiller for mindst ${d.minimum} kr.` };
      delivery = { address: where.value, postcode: HARBOUR_POSTCODE, fee: d.fee, harbour: true };
    } else {
      const address = input.delivery.address?.trim().slice(0, 120) ?? "";
      const postcode = input.delivery.postcode?.trim() ?? "";
      if (!address) return { ok: false, error: "Skriv din adresse, så de ved, hvor de skal køre hen." };
      if (!d.postcodes.includes(postcode)) return { ok: false, error: `${place.name} kører kun ud til ${d.postcodes.join(", ")}.` };
      if (food < d.minimum) return { ok: false, error: `Levering kræver, at du bestiller for mindst ${d.minimum} kr.` };
      delivery = { address, postcode, fee: d.fee };
    }
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
  if (isClosedOn(place.closedDays, input.date)) return { ok: false, error: "Restauranten holder lukket den dag. Vælg en anden dag." };
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 50) return { ok: false, error: "Vælg hvor mange I er." };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Skriv dit navn." };
  const phone = cleanPhone(input.phone ?? "");
  if (!phone) return { ok: false, error: "Skriv dit telefonnummer med 8 cifre. Et udenlandsk nummer skal starte med +." };
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
