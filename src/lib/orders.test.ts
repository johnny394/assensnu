import { describe, expect, it } from "vitest";
import { demoPlace } from "@/data/places";
import { buildBooking, buildOrder, cleanPhone } from "./orders";

const friday = new Date("2026-10-16T15:30:00Z"); // 17:30 i Assens
const input = { items: [{ itemId: "d1", quantity: 2 }, { itemId: "d5", quantity: 1 }], name: "Johnny", phone: "12345678", pickup: "asap" };

describe("buildOrder", () => {
  it("regner prisen ud fra menuen", () => {
    const r = buildOrder(demoPlace, input, friday);
    expect(r.ok && r.value.total).toBe(2 * 75 + 70);
    expect(r.ok && r.value.customerPhone).toBe("12 34 56 78");
  });

  it("afviser udsolgte retter", () => {
    const place = structuredClone(demoPlace);
    place.menu[0].items[0].soldOut = true;
    const r = buildOrder(place, input, friday);
    expect(r).toEqual({ ok: false, error: "Margherita er desværre udsolgt." });
  });

  it("afviser steder, der ikke tager imod bestillinger", () => {
    expect(buildOrder({ ...demoPlace, acceptsOrders: false }, input, friday).ok).toBe(false);
  });

  it("afviser et tidspunkt, der ikke kan vælges", () => {
    expect(buildOrder(demoPlace, { ...input, pickup: "03:00" }, friday).ok).toBe(false);
  });

  it("lægger leveringsgebyret oven i og tjekker by og minimum", () => {
    const place = { ...demoPlace, delivery: { fee: 39, minimum: 200, postcodes: ["5610"] } };
    const r = buildOrder(place, { ...input, delivery: { address: "Østergade 12", postcode: "5610" } }, friday);
    expect(r.ok && r.value.total).toBe(2 * 75 + 70 + 39);
    expect(r.ok && r.value.delivery).toEqual({ address: "Østergade 12", postcode: "5610", fee: 39 });
    expect(buildOrder(place, { ...input, delivery: { address: "Vestergade 1", postcode: "5620" } }, friday).ok).toBe(false);
    expect(buildOrder(place, { ...input, items: [{ itemId: "d1", quantity: 1 }], delivery: { address: "Østergade 12", postcode: "5610" } }, friday).ok).toBe(false);
    expect(buildOrder(demoPlace, { ...input, delivery: { address: "Østergade 12", postcode: "5610" } }, friday).ok).toBe(false);
  });
});

describe("cleanPhone", () => {
  it("godtager danske numre skrevet på forskellige måder", () => {
    expect(cleanPhone("+45 12 34 56 78")).toBe("12 34 56 78");
    expect(cleanPhone("12345678")).toBe("12 34 56 78");
    expect(cleanPhone("1234")).toBeNull();
  });
});

describe("buildBooking", () => {
  const booking = { date: "2026-10-24", time: "19:00", guests: 4, name: "Hanne", phone: "87654321" };
  it("godtager en gyldig forespørgsel", () => {
    expect(buildBooking(demoPlace, booking, "2026-10-17").ok).toBe(true);
  });
  it("afviser datoer i fortiden", () => {
    expect(buildBooking(demoPlace, { ...booking, date: "2026-10-01" }, "2026-10-17").ok).toBe(false);
  });
});
