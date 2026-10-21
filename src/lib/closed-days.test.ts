import { describe, expect, it } from "vitest";
import { demoPlace } from "@/data/places";
import { cleanClosedDays, nextClosed, periodText, upcomingHolidays } from "./closed-days";
import { bookingTimes } from "./events";
import { openStatus } from "./hours";

describe("lukkedage", () => {
  it("tjekker datoerne og smider gamle perioder væk", () => {
    const r = cleanClosedDays([{ from: "2026-12-24", to: "2026-12-26", note: " Jul " }, { from: "2026-10-01", to: "2026-10-02" }], "2026-10-21");
    expect(r).toEqual({ ok: true, value: [{ from: "2026-12-24", to: "2026-12-26", note: "Jul" }] });
    expect(cleanClosedDays([{ from: "2026-12-26", to: "2026-12-24" }], "2026-10-21").ok).toBe(false);
    expect(cleanClosedDays([{ from: "24/12" }], "2026-10-21").ok).toBe(false);
  });

  it("skriver perioden pænt", () => {
    expect(periodText({ from: "2026-12-24", to: "2026-12-24" })).toBe("24. december");
    expect(periodText({ from: "2026-12-24", to: "2026-12-26" })).toBe("24.–26. december");
    expect(periodText({ from: "2026-12-30", to: "2027-01-02" })).toBe("30. december–2. januar");
    expect(periodText({ from: "2026-12-24", to: "2026-12-26" }, "en")).toBe("24–26 December");
  });

  it("finder næste helligdag og den periode, kunderne skal se", () => {
    expect(upcomingHolidays("2026-12-25").map((h) => h.from)).toEqual(["2026-12-25", "2026-12-26", "2026-12-31", "2027-01-01", "2027-12-24"]);
    const periods = [{ from: "2026-12-24", to: "2026-12-26" }];
    expect(nextClosed(periods, "2026-10-21")).toBeUndefined();
    expect(nextClosed(periods, "2026-12-15")).toEqual(periods[0]);
  });

  it("springer lukkedage over, når der står hvornår stedet åbner", () => {
    // Fredag 16. oktober kl. 23.30: næste åbning er lørdag, men lørdag og søndag er lukket
    const friday = new Date("2026-10-16T21:30:00Z");
    const place = { ...demoPlace, closedDays: [{ from: "2026-10-17", to: "2026-10-18" }] };
    const status = openStatus(place, friday);
    expect(status.state === "closed" && status.opensAt?.day).toBe(0); // mandag
    expect(bookingTimes(place, "2026-10-17")).toEqual([]);
  });
});
