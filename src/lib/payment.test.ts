import { describe, expect, it } from "vitest";
import { bynuFee, shownToPlace } from "./payment";

describe("online betaling", () => {
  it("viser kun ordren for restauranten, når kunden har betalt", () => {
    expect(shownToPlace({})).toBe(true);
    expect(shownToPlace({ payment: { status: "pending" } })).toBe(false);
    expect(shownToPlace({ payment: { status: "failed" } })).toBe(false);
    expect(shownToPlace({ payment: { status: "held" } })).toBe(true);
    expect(shownToPlace({ payment: { status: "paid" } })).toBe(true);
    expect(shownToPlace({ payment: { status: "released" } })).toBe(true);
  });

  it("regner ByNus andel i øre og tåler dansk komma", () => {
    expect(bynuFee(200, "2.5")).toBe(500);
    expect(bynuFee(200, "2,5")).toBe(500);
    expect(bynuFee(149, "3")).toBe(447);
    expect(bynuFee(200, undefined)).toBe(0);
    expect(bynuFee(200, "")).toBe(0);
    expect(bynuFee(200, "abc")).toBe(0);
    expect(bynuFee(200, "80")).toBe(0);
  });
});
