import { describe, expect, it } from "vitest";
import { bookingsSheet, dishesSheet, ordersSheet, toCsv, withoutCustomer } from "./export";
import type { Order } from "./types";

const order: Order = {
  id: "o1",
  number: 101,
  placeSlug: "pizza",
  placeName: "Pizza",
  customerName: "Mette Hansen",
  customerPhone: "12345678",
  pickup: "asap",
  delivery: { address: "Østergade 1", postcode: "5610", fee: 30 },
  note: "Ring på",
  lines: [
    { itemId: "a", name: "Margherita", price: 80, quantity: 2, size: "Stor", extras: ["Ost", "Chili"], person: "Mette" },
    { itemId: "b", name: "Cola", price: 12.5, quantity: 1, halfPrice: true },
  ],
  total: 202.5,
  status: "picked_up",
  readyAt: "18:30",
  createdAt: "2026-10-23T16:05:00Z",
};

describe("data til dashboard", () => {
  it("tager navn, telefon, adresse og besked ud", () => {
    const text = JSON.stringify(withoutCustomer(order));
    for (const secret of ["Mette", "12345678", "Østergade", "Ring på"]) expect(text).not.toContain(secret);
    expect(withoutCustomer(order).lines[0].shared).toBe(true);
  });

  it("laver dansk regneark med semikolon, komma og BOM", () => {
    expect(toCsv([["a;b", 12.5, true, null], ['Sig "hej"', 3, false, undefined]])).toBe('﻿"a;b";12,5;"Ja";""\r\n"Sig ""hej""";3;"Nej";""');
  });

  it("én linje pr. bestilling, i dansk tid", () => {
    const [head, row] = ordersSheet([withoutCustomer(order)], "Assens");
    const get = (name: string) => row[head.indexOf(name)];
    expect(get("Dato")).toBe("2026-10-23");
    expect(get("Tid")).toBe("18:05");
    expect(get("Ugedag")).toBe("Fredag");
    expect(get("Time")).toBe(18);
    expect(get("Måde")).toBe("Levering");
    expect(get("Postnummer")).toBe("5610");
    expect(get("Antal retter")).toBe(3);
    expect(get("Mad (kr.)")).toBe(172.5);
    expect(get("Levering (kr.)")).toBe(30);
    expect(get("Fællesbestilling")).toBe(true);
    expect(get("Status")).toBe("Hentet");
  });

  it("én linje pr. ret og pr. bord", () => {
    const dishes = dishesSheet([withoutCustomer({ ...order, delivery: { address: "Bro 3", postcode: "", fee: 0, harbour: true } })], "Assens");
    expect(dishes).toHaveLength(3);
    expect(dishes[1][dishes[0].indexOf("Måde")]).toBe("Til båden");
    expect(dishes[1][dishes[0].indexOf("Beløb (kr.)")]).toBe(160);
    expect(dishes[1][dishes[0].indexOf("Tilvalg")]).toBe("Ost, Chili");
    const borde = bookingsSheet([{ id: "b1", placeSlug: "pizza", placeName: "Pizza", date: "2026-10-24", time: "19:00", guests: 4, status: "confirmed", createdAt: "2026-10-22T09:00:00Z" }], "Assens");
    expect(borde[1]).toEqual(["b1", "Assens", "pizza", "Pizza", "2026-10-22", "11:00", "2026-10-24", "19:00", "Lørdag", 4, "Bekræftet"]);
  });
});
