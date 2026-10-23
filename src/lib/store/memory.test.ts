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

describe("følgere", () => {
  it("husker hver telefon én gang og glemmer den, når den stopper", async () => {
    const sub = (n: string) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: "p", auth: "a" } });
    await store.follow("proevepizza", sub("a"));
    await store.follow("proevepizza", sub("b"));
    await store.follow("proevepizza", sub("b"));
    expect((await store.listFollowers("proevepizza")).map((s) => s.endpoint)).toEqual(["https://push.example/a", "https://push.example/b"]);
    await store.unfollow("proevepizza", "https://push.example/a");
    expect((await store.listFollowers("proevepizza")).map((s) => s.endpoint)).toEqual(["https://push.example/b"]);
  });
});

describe("mikro-tags", () => {
  it("gemmer tags én gang pr. ordre og finder dem til stemningen", async () => {
    const since = new Date(Date.now() - 1000).toISOString();
    const o = await order("50505050");
    expect(await store.saveOrderTags(o.id, ["hot", "service"])).toBe(true);
    expect(await store.saveOrderTags(o.id, ["wait"])).toBe(false);
    expect((await store.getOrder(o.id))?.tags).toEqual(["hot", "service"]);
    expect((await store.recentTags("proevepizza", since)).map((r) => r.tags)).toEqual([["hot", "service"]]);
    await store.saveVibe("proevepizza", { text: "Kunderne roser især den varme mad.", count: 3, at: new Date().toISOString() });
    expect((await store.getPlace("proevepizza"))?.vibe?.text).toBe("Kunderne roser især den varme mad.");
  });
});
