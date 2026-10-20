import { describe, expect, it } from "vitest";
import { demoPlace } from "@/data/places";
import { activeLastChance, cleanLastChanceItems, lastChanceEnd, lastChancePrice } from "./last-chance";
import { buildOrder } from "./orders";

const friday = new Date("2026-10-16T15:30:00Z"); // 17:30 i Assens

describe("sidste chance", () => {
  it("halv pris rundes op til hele kroner", () => {
    expect(lastChancePrice(75)).toBe(38);
    expect(lastChancePrice(70)).toBe(35);
  });

  it("slutter ved lukketid", () => {
    const end = lastChanceEnd({ hours: [{ day: 4, open: "11:00", close: "21:00" }] }, friday);
    expect(end?.toISOString()).toBe("2026-10-16T19:00:00.000Z");
    expect(lastChanceEnd({ hours: [{ day: 4, open: "11:00", close: "17:00" }] }, friday)).toBeNull();
  });

  it("gælder kun, til tiden er gået", () => {
    const saved = { itemIds: ["d1"], until: "2026-10-16T19:00:00Z" };
    expect(activeLastChance(saved, friday)).toEqual(saved);
    expect(activeLastChance(saved, new Date("2026-10-16T19:00:01Z"))).toBeUndefined();
    expect(activeLastChance(null, friday)).toBeUndefined();
  });

  it("giver halv pris i ordren og markerer linjen", () => {
    const place = { ...demoPlace, lastChance: { itemIds: ["d1"], until: "2026-10-16T19:00:00Z" } };
    const r = buildOrder(place, { items: [{ itemId: "d1", quantity: 2 }, { itemId: "d5", quantity: 1 }], name: "Johnny", phone: "12345678", pickup: "asap" }, friday);
    expect(r.ok && r.value.total).toBe(2 * 38 + 70);
    expect(r.ok && r.value.lines.map((l) => l.halfPrice ?? false)).toEqual([true, false]);
  });

  it("tager kun retter fra stedets menu", () => {
    expect(cleanLastChanceItems(demoPlace, ["d1", "d1"])).toEqual({ ok: true, value: ["d1"] });
    expect(cleanLastChanceItems(demoPlace, ["findes-ikke"]).ok).toBe(false);
    expect(cleanLastChanceItems(demoPlace, []).ok).toBe(false);
  });
});
