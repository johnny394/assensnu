import { describe, expect, it } from "vitest";
import { cleanBasics, makeSlug, newPin } from "./admin";

describe("makeSlug", () => {
  it("laver danske bogstaver om og undgår dubletter", () => {
    expect(makeSlug("Café Ærø & Søn", [])).toBe("cafe-aeroe-soen");
    expect(makeSlug("Grillhjørnet", ["grillhjoernet"])).toBe("grillhjoernet-2");
    expect(makeSlug("!!!", [])).toBe("sted");
  });
});

describe("cleanBasics", () => {
  it("kræver navn og adresse og retter telefon og madtyper", () => {
    expect(cleanBasics({ name: " ", address: "x" }).ok).toBe(false);
    const r = cleanBasics({ name: "Pizza Nord", address: "Nørregade 1", phone: "+45 12345678", cuisines: "pizza, , kebab", takeaway: true, dineIn: "nej" });
    expect(r).toEqual({ ok: true, value: { name: "Pizza Nord", address: "Nørregade 1", phone: "12 34 56 78", cuisines: ["Pizza", "Kebab"], takeaway: true, dineIn: null } });
    expect(cleanBasics({ name: "A", address: "B", phone: "123" })).toEqual({ ok: false, error: "Telefonnummeret skal have 8 cifre." });
  });
});

describe("newPin", () => {
  it("giver 4 cifre, der ikke er lette at gætte", () => {
    for (let i = 0; i < 500; i++) {
      const pin = newPin();
      expect(pin).toMatch(/^\d{4}$/);
      expect(["1234", "0000", "1111", "4321", "1990"]).not.toContain(pin);
    }
  });
});
