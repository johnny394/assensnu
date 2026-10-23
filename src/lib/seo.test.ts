import { describe, expect, it } from "vitest";
import { sitemapEntries } from "./seo";
import type { Place } from "./types";

const place = (slug: string, extra: Partial<Place>) => ({ slug, ...extra }) as Place;

describe("sitemap", () => {
  it("viser byvælgeren og artiklerne på bynu.dk", () => {
    const urls = sitemapEntries("bynu.dk", []).map((e) => e.url);
    expect(urls[0]).toBe("https://bynu.dk");
    expect(urls.some((u) => u.startsWith("https://bynu.dk/artikel/"))).toBe(true);
  });

  it("tager kun steder med, som kunderne kan åbne", () => {
    const places = [place("bryggen", { member: true }), place("laast", { member: false }), place("proevepizza", { member: true, demo: true })];
    const urls = sitemapEntries("assens.bynu.dk", places).map((e) => e.url);
    expect(urls).toContain("https://assens.bynu.dk/sted/bryggen");
    expect(urls).not.toContain("https://assens.bynu.dk/sted/laast");
    expect(urls).not.toContain("https://assens.bynu.dk/sted/proevepizza");
  });
});
