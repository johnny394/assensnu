import { describe, expect, it } from "vitest";
import { memoryStore as store } from "./memory";

const order = (phone: string) =>
  store.createOrder({ placeSlug: "proevepizza", placeName: "Prøvepizza", customerName: "Bente", customerPhone: phone, pickup: "asap", note: "uden løg", lines: [], total: 89 });

describe("kundedata", () => {
  it("tæller kun bestillinger fra samme nummer efter tidspunktet", async () => {
    const before = new Date(Date.now() - 1000).toISOString();
    await order("20202020");
    await order("20202020");
    await order("30303030");
    expect(await store.countOrdersByPhone("20202020", before)).toBe(2);
    expect(await store.countOrdersByPhone("20202020", new Date(Date.now() + 1000).toISOString())).toBe(0);
  });

  it("sletter navn, telefon og besked på gamle ordrer, men beholder ordren", async () => {
    const o = await order("40404040");
    await store.forgetCustomers(new Date(Date.now() + 1000).toISOString());
    const kept = await store.getOrder(o.id);
    expect(kept).toMatchObject({ customerName: "Slettet", customerPhone: "", total: 89 });
    expect(kept?.note).toBeUndefined();
  });
});
