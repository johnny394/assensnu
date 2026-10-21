import { describe, expect, it } from "vitest";
import { monthByPlace, topDishes, weekStart, weeklyStats } from "./stats";

const order = (createdAt: string, total: number, status = "picked_up", placeSlug = "a") => ({ placeSlug, placeName: placeSlug.toUpperCase(), createdAt, status, total, lines: [{ name: "Durum", quantity: 2 }] });

describe("tal", () => {
  it("finder ugens mandag", () => {
    expect(weekStart("2026-10-21")).toBe("2026-10-19");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
  });

  it("lægger ordrer, borde og følgere i den rigtige uge og springer afviste over", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    const weeks = weeklyStats(
      {
        orders: [order("2026-10-20T10:00:00Z", 100), order("2026-10-20T11:00:00Z", 80, "rejected"), order("2026-10-14T10:00:00Z", 50)],
        bookings: [{ placeSlug: "a", createdAt: "2026-10-19T08:00:00Z", status: "confirmed", guests: 4 }],
        followerDates: ["2026-10-21T09:00:00Z"],
      },
      now,
      2,
    );
    expect(weeks).toEqual([
      { start: "2026-10-19", orders: 1, revenue: 100, bookings: 1, guests: 4, newFollowers: 1 },
      { start: "2026-10-12", orders: 1, revenue: 50, bookings: 0, guests: 0, newFollowers: 0 },
    ]);
  });

  it("samler en måned pr. sted til fakturering", () => {
    const rows = monthByPlace([order("2026-10-01T10:00:00Z", 100), order("2026-10-31T21:30:00Z", 50, "picked_up", "b"), order("2026-09-30T21:30:00Z", 70), order("2026-10-02T10:00:00Z", 30, "rejected")], "2026-10");
    // 30. september kl. 23.30 dansk tid hører til september, 31. oktober kl. 22.30 til oktober
    expect(rows).toEqual([
      { placeSlug: "a", placeName: "A", orders: 1, revenue: 100, rejected: 1 },
      { placeSlug: "b", placeName: "B", orders: 1, revenue: 50, rejected: 0 },
    ]);
    expect(topDishes([order("2026-10-20T10:00:00Z", 1)], "2026-10-19")).toEqual([{ name: "Durum", quantity: 2 }]);
  });
});
