import { describe, expect, it } from "vitest";
import { activeWait, busyUntilFrom, cleanNews, clockTime, todaysNews } from "./live";

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
    expect(todaysNews("Tilbud", sent, at("2026-10-21T10:00:00Z"))).toEqual({ text: "Tilbud", sentAt: sent });
    expect(todaysNews("Tilbud", sent, at("2026-10-22T10:00:00Z"))).toBeUndefined();
    expect(todaysNews(null, sent)).toBeUndefined();
  });
});
