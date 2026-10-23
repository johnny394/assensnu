import { describe, expect, it } from "vitest";
import { bynuFee, monthlyKr, shownToPlace, stripeProfile, subscriptionState } from "./payment";

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

  it("viser abonnementet som betalt, ikke betalt eller ikke startet", () => {
    expect(subscriptionState(null)).toBe("none");
    expect(subscriptionState({ customer: "cus_1" })).toBe("none");
    expect(subscriptionState({ customer: "cus_1", status: "active" })).toBe("active");
    expect(subscriptionState({ customer: "cus_1", status: "past_due" })).toBe("problem");
    expect(subscriptionState({ customer: "cus_1", status: "canceled" })).toBe("none");
    expect(subscriptionState({ customer: "cus_1", status: "active" }, false)).toBe("unavailable");
    expect(monthlyKr(undefined)).toBe(299);
    expect(monthlyKr("349")).toBe(349);
    expect(monthlyKr("x")).toBe(299);
  });

  it("udfylder adresse, telefon og beskrivelse til Stripe på forhånd", () => {
    const p = stripeProfile({ name: "Pizza Nord", slug: "pizza-nord", address: "Østergade 12, 5610 Assens", phone: "12 34 56 78", cuisines: ["Pizza", "Kebab"] }, "https://assens.bynu.dk");
    expect(p).toEqual({
      name: "Pizza Nord",
      url: "https://assens.bynu.dk/sted/pizza-nord",
      mcc: "5812",
      product_description: "Restaurant (pizza, kebab). Kunderne bestiller takeaway og betaler online gennem ByNu.",
      support_phone: "+4512345678",
      support_address: { line1: "Østergade 12", postal_code: "5610", city: "Assens", country: "DK" },
    });
    const bare = stripeProfile({ name: "A", slug: "a", address: "Havnen", phone: "123", cuisines: [] }, "https://x.dk");
    expect(bare).not.toHaveProperty("support_phone");
    expect(bare).not.toHaveProperty("support_address");
    expect(bare.product_description).toBe("Restaurant. Kunderne bestiller takeaway og betaler online gennem ByNu.");
  });
});
