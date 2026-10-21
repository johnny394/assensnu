import { describe, expect, it } from "vitest";
import { demoPlace } from "@/data/places";
import { cleanEvent, eatBefore, upcoming, type AssensEvent } from "./events";

const today = "2026-10-23"; // fredag
const event: AssensEvent = { id: "e1", title: "Koncert", date: today, time: "20:00", venue: "Tobaksgaarden" };
const place = { ...demoPlace, member: true, acceptsBookings: true, acceptsOrders: true, closedToday: false, hours: [{ day: 4 as const, open: "11:00", close: "22:00" }] };

describe("events", () => {
  it("tjekker det, Johnny skriver", () => {
    const ok = cleanEvent({ title: " Koncert ", date: today, time: "20:00", venue: "Tobaksgaarden", link: "billetto.dk/x" }, today);
    expect(ok.ok && ok.value).toEqual({ title: "Koncert", date: today, time: "20:00", venue: "Tobaksgaarden", text: undefined, link: "https://billetto.dk/x" });
    expect(cleanEvent({ title: "Koncert", date: "2026-10-22", time: "20:00", venue: "X" }, today).ok).toBe(false);
    expect(cleanEvent({ title: "Koncert", date: today, time: "25:00", venue: "X" }, today).ok).toBe(false);
    expect(cleanEvent({ title: "", date: today, time: "20:00", venue: "X" }, today).ok).toBe(false);
  });

  it("viser kun kommende, de første først", () => {
    const list = upcoming([{ ...event, id: "b", date: "2026-10-30" }, { ...event, id: "gammel", date: "2026-10-01" }, event], today);
    expect(list.map((e) => e.id)).toEqual(["e1", "b"]);
  });

  it("foreslår bord i god tid og mad klar før start", () => {
    const [r] = eatBefore([place], event, today);
    expect(r.bookTime).toBe("18:30");
    expect(r.takeawayTime).toBe("19:15");
  });

  it("takeaway kun samme dag, og ingen bord langt ude i fremtiden", () => {
    const [nextWeek] = eatBefore([place], { ...event, date: "2026-10-30" }, today);
    expect(nextWeek.bookTime).toBe("18:30");
    expect(nextWeek.takeawayTime).toBeNull();
    expect(eatBefore([place], { ...event, date: "2026-12-25" }, today).every((r) => !r.bookTime)).toBe(true);
  });

  it("springer steder over, der har lukket", () => {
    expect(eatBefore([{ ...place, hours: [{ day: 4, open: "11:00", close: "17:00" }] }], event, today)).toEqual([]);
    expect(eatBefore([{ ...place, member: false }], event, today)).toEqual([]);
  });
});
