import { describe, expect, it } from "vitest";
import { rankOffers } from "./offers";
import type { Place } from "./types";

const now = new Date("2026-10-20T15:00:00Z"); // tirsdag kl. 17 i Assens
const open = [{ day: 1 as const, open: "11:00", close: "22:00" }];
const closed = [{ day: 1 as const, open: "06:00", close: "10:00" }];
const news = { text: "Tilbud", sentAt: now.toISOString() };
const place = (slug: string, hours = open) => ({ slug, name: slug, member: true, news, hours, menu: [] }) as unknown as Place;

describe("rækkefølgen på dagens tilbud", () => {
  const places = [place("a"), place("b"), place("c", closed), place("d"), { ...place("e"), news: undefined }, { ...place("f"), member: false }];

  it("har åbne steder før lukkede og springer steder uden tilbud over", () => {
    const ranked = rankOffers(places, { now, favorites: [], seed: 0.3 });
    expect(ranked.map((o) => o.place.slug).sort()).toEqual(["a", "b", "c", "d"]);
    expect(ranked.at(-1)?.place.slug).toBe("c");
  });

  it("sætter kundens favoritter først blandt de åbne", () => {
    for (const seed of [0.1, 0.5, 0.9]) {
      expect(rankOffers(places, { now, favorites: ["d", "c"], seed })[0].place.slug).toBe("d");
    }
  });

  it("blander forskelligt fra besøg til besøg, men ens med samme tal", () => {
    const order = (seed: number) => rankOffers(places, { now, favorites: [], seed }).map((o) => o.place.slug).join();
    expect(order(0.42)).toBe(order(0.42));
    expect(new Set([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map(order)).size).toBeGreaterThan(1);
  });
});
