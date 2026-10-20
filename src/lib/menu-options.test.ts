import { describe, expect, it } from "vitest";
import { demoPlace } from "@/data/places";
import { choiceKey, choiceText, parseKey, priceChoice } from "./menu-options";
import { buildOrder } from "./orders";

const friday = new Date("2026-10-16T15:30:00Z"); // 17:30 i Assens

describe("størrelser og tilvalg", () => {
  it("lægger størrelse og tilvalg oven i prisen", () => {
    const r = priceChoice(demoPlace, { itemId: "d1", size: "Familie", extras: ["Bacon", "Kebab"] });
    expect(r.ok && r.value.price).toBe(75 + 90 + 12 + 16);
    expect(r.ok && choiceText(r.value)).toBe("Familie + bacon, kebab");
  });

  it("bruger den første størrelse, hvis kunden ikke har valgt", () => {
    const r = priceChoice(demoPlace, { itemId: "d1" });
    expect(r.ok && r.value).toMatchObject({ price: 75, size: "Alm." });
  });

  it("afviser tilvalg og størrelser, der ikke findes", () => {
    expect(priceChoice(demoPlace, { itemId: "d1", extras: ["Guld"] }).ok).toBe(false);
    expect(priceChoice(demoPlace, { itemId: "d1", size: "Kæmpe" }).ok).toBe(false);
    expect(priceChoice(demoPlace, { itemId: "d5", extras: ["Bacon"] }).ok).toBe(false);
  });

  it("husker valget i kurven og kan læse gamle kurve", () => {
    const key = choiceKey({ itemId: "d1", size: "Familie", extras: ["Kebab", "Bacon"] });
    expect(parseKey(key)).toEqual({ itemId: "d1", size: "Familie", extras: ["Bacon", "Kebab"] });
    expect(parseKey("d5")).toEqual({ itemId: "d5" });
  });

  it("regner ordren ud med valgene på serveren", () => {
    const input = { items: [{ itemId: "d1", quantity: 2, size: "Familie", extras: ["Bacon"] }], name: "Johnny", phone: "12345678", pickup: "asap" };
    const r = buildOrder(demoPlace, input, friday);
    expect(r.ok && r.value.lines[0]).toEqual({ itemId: "d1", name: "Margherita", price: 75 + 90 + 12, quantity: 2, size: "Familie", extras: ["Bacon"] });
    expect(r.ok && r.value.total).toBe(2 * (75 + 90 + 12));
  });
});
