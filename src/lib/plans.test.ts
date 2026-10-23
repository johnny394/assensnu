import { describe, expect, it } from "vitest";
import { activePlan, chosenPlan, freePushLeft, usedThisMonth, withMoms, withPlan } from "./plans";

describe("pakker", () => {
  it("giver alle Fuld pakke til og med 31. januar 2027", () => {
    expect(activePlan(null, "2026-11-15")).toBe("fuld");
    expect(activePlan(null, "2027-01-31")).toBe("fuld");
    expect(activePlan({ customer: "c", status: "trialing", plan: "basis" }, "2027-01-31")).toBe("fuld");
  });

  it("bruger den valgte pakke bagefter, og Basis uden betaling", () => {
    expect(activePlan({ customer: "c", status: "active", plan: "event" }, "2027-02-01")).toBe("event");
    expect(activePlan({ customer: "c", status: "past_due", plan: "fuld" }, "2027-02-01")).toBe("basis");
    expect(activePlan(null, "2027-02-01")).toBe("basis");
    // Abonnementer fra før pakkerne havde alt med
    expect(chosenPlan({ customer: "c", status: "active" })).toBe("fuld");
    expect(chosenPlan({ customer: "c", status: "canceled", plan: "fuld" })).toBeNull();
  });

  it("tæller gratis beskeder pr. måned", () => {
    expect(usedThisMonth({ month: "2026-11", used: 3 }, "2026-11-20")).toBe(3);
    expect(usedThisMonth({ month: "2026-10", used: 3 }, "2026-11-01")).toBe(0);
    expect(freePushLeft("fuld", { month: "2026-11", used: 3 }, "2026-11-20")).toBe(1);
    expect(freePushLeft("fuld", { month: "2026-11", used: 5 }, "2026-11-20")).toBe(0);
    expect(freePushLeft("event", null, "2026-11-20")).toBe(1);
    expect(freePushLeft("basis", null, "2026-11-20")).toBe(0);
  });

  it("lægger moms oven i", () => {
    expect(withMoms(99)).toBe(123.75);
    expect(withMoms(29)).toBe(36.25);
  });

  it("slukker takeaway, levering og online betaling uden Fuld pakke", () => {
    const place = { acceptsOrders: true, delivery: { fee: 30, minimum: 100, postcodes: ["5610"] }, onlinePay: true };
    expect(withPlan(place, null, "2026-12-01")).toEqual({ ...place, plan: "fuld" });
    expect(withPlan(place, null, "2027-02-01")).toEqual({ acceptsOrders: false, delivery: null, onlinePay: undefined, plan: "basis" });
    expect(withPlan(place, { customer: "c", status: "active", plan: "fuld" }, "2027-02-01").acceptsOrders).toBe(true);
  });
});
