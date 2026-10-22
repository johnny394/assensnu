import { beforeEach, describe, expect, it, vi } from "vitest";

// En falsk Stripe, der husker, hvad den blev bedt om
const calls: { what: string; args: unknown[] }[] = [];
const fake = { session: "open" as string, intent: "requires_capture" as string };
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class {
    checkout = {
      sessions: {
        create: async (...args: unknown[]) => (calls.push({ what: "session", args }), { id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" }),
        retrieve: async () => ({ id: "cs_1", status: fake.session, payment_intent: "pi_1" }),
      },
    };
    paymentIntents = {
      retrieve: async () => ({ id: "pi_1", status: fake.intent }),
      capture: async (...args: unknown[]) => (calls.push({ what: "capture", args }), { id: "pi_1", status: "succeeded" }),
      cancel: async (...args: unknown[]) => (calls.push({ what: "cancel", args }), { id: "pi_1", status: "canceled" }),
    };
    accounts = {
      create: async (...args: unknown[]) => (calls.push({ what: "account", args }), { id: "acct_1" }),
      retrieve: async () => ({ id: "acct_1", charges_enabled: true }),
    };
    accountLinks = { create: async (...args: unknown[]) => (calls.push({ what: "link", args }), { url: "https://connect.stripe.com/setup/1" }) };
  },
}));

async function setup() {
  const { store } = await import("./store");
  const s = await import("./stripe");
  const place = (await store.getPlace("proevepizza"))!;
  return { store, s, place };
}

describe("online betaling med Stripe", () => {
  beforeEach(() => {
    calls.length = 0;
    fake.session = "open";
    fake.intent = "requires_capture";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.BYNU_PROCENT = "2,5";
  });

  it("opretter restaurantens egen konto, hvor den selv betaler gebyret, og sender den til Stripe", async () => {
    const { store, s, place } = await setup();
    expect(await s.onlinePayState(place)).toBe("off");
    expect(await s.connectLink(place, "https://assens.bynu.dk")).toBe("https://connect.stripe.com/setup/1");
    const account = calls.find((c) => c.what === "account")!.args[0] as { country: string; controller: { fees: { payer: string }; stripe_dashboard: { type: string } } };
    expect(account.country).toBe("DK");
    expect(account.controller.fees.payer).toBe("account");
    expect(account.controller.stripe_dashboard.type).toBe("full");
    expect(await s.onlinePayState(place)).toBe("started");
    // Tilbage fra Stripe: kontoen er klar
    expect(await s.checkAccount(place.slug)).toBe(true);
    expect((await store.getPlace(place.slug))!.onlinePay).toBe(true);
  });

  it("reserverer pengene, viser først ordren, når der er betalt, og trækker dem ved Accepter", async () => {
    const { store, s, place } = await setup();
    await store.saveStripeAccount(place.slug, "acct_1", true);
    const order = await store.createOrder({ placeSlug: place.slug, placeName: place.name, customerName: "Jens", customerPhone: "12345678", pickup: "asap", lines: [], total: 200, payment: { status: "pending" } });

    expect(await s.startPayment(order, "https://assens.bynu.dk")).toBe("https://checkout.stripe.com/c/cs_1");
    const [params, options] = calls.find((c) => c.what === "session")!.args as [
      { line_items: { price_data: { currency: string; unit_amount: number } }[]; payment_intent_data: { capture_method: string; application_fee_amount: number }; success_url: string },
      { stripeAccount: string },
    ];
    expect(options.stripeAccount).toBe("acct_1");
    expect(params.line_items[0].price_data).toMatchObject({ currency: "dkk", unit_amount: 20000 });
    expect(params.payment_intent_data).toMatchObject({ capture_method: "manual", application_fee_amount: 500 });
    expect(params.success_url).toBe(`https://assens.bynu.dk/ordre/${order.id}`);

    // Kunden er stadig hos Stripe: restauranten kan ikke se ordren
    expect((await s.ordersForPlace(place.slug)).map((o) => o.id)).not.toContain(order.id);
    fake.session = "complete";
    const shown = (await s.ordersForPlace(place.slug)).find((o) => o.id === order.id)!;
    expect(shown.payment).toMatchObject({ status: "held", intent: "pi_1" });

    expect(await s.settlePayment(shown, true)).toBe(true);
    expect(calls.some((c) => c.what === "capture")).toBe(true);
    expect((await store.getOrder(order.id))!.payment!.status).toBe("paid");
  });

  it("frigiver pengene ved afvisning, og en opgivet betaling når aldrig restauranten", async () => {
    const { store, s, place } = await setup();
    await store.saveStripeAccount(place.slug, "acct_1", true);
    const base = { placeSlug: place.slug, placeName: place.name, customerName: "Jens", customerPhone: "12345678", pickup: "asap", lines: [], total: 120 };
    const held = await store.createOrder({ ...base, payment: { status: "held", session: "cs_1", intent: "pi_1" } });
    expect(await s.settlePayment(held, false)).toBe(true);
    expect(calls.some((c) => c.what === "cancel")).toBe(true);
    expect((await store.getOrder(held.id))!.payment!.status).toBe("released");

    const given = await store.createOrder({ ...base, payment: { status: "pending", session: "cs_1" } });
    fake.session = "expired";
    expect((await s.syncPayment(given)).payment!.status).toBe("failed");
    expect((await s.ordersForPlace(place.slug)).map((o) => o.id)).not.toContain(given.id);
  });

  it("melder fejl, hvis Stripe ikke kunne trække pengene", async () => {
    const { store, s, place } = await setup();
    await store.saveStripeAccount(place.slug, "acct_1", true);
    fake.intent = "canceled";
    const held = await store.createOrder({ placeSlug: place.slug, placeName: place.name, customerName: "Jens", customerPhone: "12345678", pickup: "asap", lines: [], total: 120, payment: { status: "held", intent: "pi_1" } });
    expect(await s.settlePayment(held, true)).toBe(false);
    expect((await store.getOrder(held.id))!.payment!.status).toBe("held");
  });
});
