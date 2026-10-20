import { describe, expect, it } from "vitest";
import { activeWait, busyUntilFrom, cleanNews, cleanNewsPrice, clockTime, orderableMenu, todaysDish, todaysNews } from "./live";
import { priceChoice } from "./menu-options";
import type { Place } from "./types";

const at = (iso: string) => new Date(iso);

describe("ventetid", () => {
  it("slukker travlt efter to timer", () => {
    const until = busyUntilFrom(15, at("2026-10-20T16:00:00Z"))!;
    expect(activeWait(15, until, at("2026-10-20T17:59:00Z"))).toEqual({ extraWaitMinutes: 15, busyUntil: "20:00" });
    expect(activeWait(15, until, at("2026-10-20T18:00:00Z"))).toEqual({ extraWaitMinutes: 0 });
  });

  it("har ingen sluttid, når der ikke er travlt", () => {
    expect(busyUntilFrom(0)).toBeNull();
    expect(activeWait(0, null)).toEqual({ extraWaitMinutes: 0 });
  });

  it("holder fast i ventetiden uden sluttid", () => {
    expect(activeWait(30, null)).toEqual({ extraWaitMinutes: 30 });
  });

  it("viser klokken i dansk tid", () => {
    expect(clockTime("2026-10-20T09:05:00Z")).toBe("11:05");
  });
});

describe("dagens ret", () => {
  it("rydder mellemrum op og afviser for lang tekst", () => {
    expect(cleanNews("  Stegt flæsk\n 109 kr. ")).toBe("Stegt flæsk 109 kr.");
    expect(cleanNews("")).toBeNull();
    expect(cleanNews("x".repeat(161))).toBeNull();
    expect(cleanNews(42)).toBeNull();
  });

  it("gælder kun den dag, den er skrevet, i dansk tid", () => {
    const sent = "2026-10-20T22:30:00Z"; // 00:30 den 21. i Assens
    expect(todaysNews("Tilbud", sent, null, at("2026-10-21T10:00:00Z"))).toEqual({ text: "Tilbud", sentAt: sent });
    expect(todaysNews("Tilbud", sent, null, at("2026-10-22T10:00:00Z"))).toBeUndefined();
    expect(todaysNews(null, sent)).toBeUndefined();
  });
});

describe("dagens ret kan bestilles", () => {
  const news = { text: "Dagens ret: Stegt flæsk med persillesovs", sentAt: "2026-10-20T09:00:00Z", price: 109 };

  it("bliver en ret med pris og et id for dagen", () => {
    expect(todaysDish(news)).toEqual({ id: "dagens-ret-2026-10-20", name: "Stegt flæsk med persillesovs", price: 109 });
    expect(todaysDish({ ...news, price: undefined })).toBeNull();
  });

  it("står øverst i det, man kan bestille, og prissættes af serveren", () => {
    const place = { menu: [{ name: "Pizza", items: [{ id: "p1", name: "Margherita", price: 75 }] }], news } as unknown as Place;
    expect(orderableMenu(place).map((c) => c.name)).toEqual(["Dagens ret", "Pizza"]);
    const line = priceChoice(place, { itemId: "dagens-ret-2026-10-20" });
    expect(line.ok && line.value.price).toBe(109);
    expect(priceChoice({ ...place, news: undefined }, { itemId: "dagens-ret-2026-10-20" }).ok).toBe(false);
  });

  it("tager kun hele kroner", () => {
    expect(cleanNewsPrice("109")).toBe(109);
    expect(cleanNewsPrice("")).toBeNull();
    expect(cleanNewsPrice("9,50")).toBeUndefined();
    expect(cleanNewsPrice(0)).toBeUndefined();
  });
});
