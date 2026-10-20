import { describe, expect, it } from "vitest";
import { slotsByHour, startLater } from "./later";

describe("slotsByHour", () => {
  it("samler tiderne pr. time", () => {
    expect(slotsByHour(["17:30", "17:45", "18:00", "18:15"])).toEqual([
      { hour: "17", slots: ["17:30", "17:45"] },
      { hour: "18", slots: ["18:00", "18:15"] },
    ]);
  });
  it("tom liste giver ingen grupper", () => {
    expect(slotsByHour([])).toEqual([]);
  });
});

describe("startLater", () => {
  it("siger hvornår køkkenet skal gå i gang", () => {
    expect(startLater("18:00", 30, 13 * 60)).toBe("17:30");
  });
  it("er null, når ordren skal laves nu", () => {
    expect(startLater("18:00", 30, 17 * 60 + 30)).toBeNull();
    expect(startLater("asap", 30, 13 * 60)).toBeNull();
  });
});
