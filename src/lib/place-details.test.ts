import { describe, expect, it } from "vitest";
import { cleanDetails } from "./place-details";

describe("cleanDetails", () => {
  it("gemmer telefon pænt og tomt som intet nummer", () => {
    expect(cleanDetails({ phone: "+45 64742006" })).toEqual({ ok: true, value: { phone: "64 74 20 06" } });
    expect(cleanDetails({ phone: "  " })).toEqual({ ok: true, value: { phone: null } });
    expect(cleanDetails({ phone: "123" }).ok).toBe(false);
  });

  it("sorterer åbningstider og afviser forkerte klokkeslæt", () => {
    const result = cleanDetails({ hours: [{ day: 2, open: "17:00", close: "02:00" }, { day: 0, open: "11:00", close: "21:00" }] });
    expect(result).toEqual({ ok: true, value: { hours: [{ day: 0, open: "11:00", close: "21:00" }, { day: 2, open: "17:00", close: "02:00" }] } });
    expect(cleanDetails({ hours: [{ day: 7, open: "11:00", close: "21:00" }] }).ok).toBe(false);
    expect(cleanDetails({ hours: [{ day: 1, open: "25:00", close: "21:00" }] }).ok).toBe(false);
    expect(cleanDetails({ hours: [{ day: 1, open: "12:00", close: "12:00" }] }).ok).toBe(false);
  });

  it("beholder rettens id og giver nye retter et id", () => {
    const id = "6f1c2a7e-3b4d-4e5f-8a9b-0c1d2e3f4a5b";
    const result = cleanDetails({ menu: [{ name: " Pizza ", items: [{ id, name: "Margherita", price: 75 }, { id: "nyt", name: "Hawaii", description: " Skinke ", price: 85.5 }] }] });
    if (!result.ok) throw new Error(result.error);
    const [margherita, hawaii] = result.value.menu![0].items;
    expect(result.value.menu![0].name).toBe("Pizza");
    expect(margherita).toEqual({ id, name: "Margherita", price: 75 });
    expect(hawaii.id).not.toBe("nyt");
    expect(hawaii).toMatchObject({ name: "Hawaii", description: "Skinke", price: 85.5 });
  });

  it("siger hvad der mangler i menuen", () => {
    expect(cleanDetails({ menu: [{ name: "", items: [] }] })).toEqual({ ok: false, error: "Giv hver kategori et navn, fx Pizza eller Drikkevarer." });
    expect(cleanDetails({ menu: [{ name: "Pizza", items: [{ name: "Margherita", price: null }] }] })).toEqual({ ok: false, error: "Margherita mangler en pris." });
  });
});
