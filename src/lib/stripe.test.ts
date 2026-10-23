import { beforeEach, describe, expect, it, vi } from "vitest";

// En falsk Stripe, der husker, hvad den blev bedt om
const calls: { what: string; args: unknown[] }[] = [];
type FakeSub = { id?: string; status: string; created: number; metadata?: Record<string, string>; items?: { data: { id: string }[] } };
const fake = { session: "open" as string, intent: "requires_capture" as string, subscriptions: [] as FakeSub[], taxRates: [] as { id: string; percentage: number; inclusive: boolean; country: string }[] };
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
    customers = { create: async (...args: unknown[]) => (calls.push({ what: "customer", args }), { id: "cus_1" }) };
    subscriptions = {
      list: async () => ({ data: fake.subscriptions }),
      update: async (...args: unknown[]) => (calls.push({ what: "update", args }), {}),
    };
    taxRates = {
      list: async () => ({ data: fake.taxRates }),
      create: async (...args: unknown[]) => (calls.push({ what: "tax", args }), { id: "txr_1" }),
    };
    products = {
      retrieve: async () => Promise.reject(new Error("No such product")),
      create: async (...args: unknown[]) => (calls.push({ what: "product", args }), { id: (args[0] as { id: string }).id }),
    };
    invoiceItems = { create: async (...args: unknown[]) => (calls.push({ what: "invoiceItem", args }), { id: "ii_1" }) };
    billingPortal = { sessions: { create: async (...args: unknown[]) => (calls.push({ what: "portal", args }), { url: "https://billing.stripe.com/p/1" }) } };
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
    fake.subscriptions = [];
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

  it("lader restauranten vælge en pakke plus moms og venter med at trække penge til 1. februar", async () => {
    const { store, s, place } = await setup();
    calls.length = 0;
    // Uden pakke er der intet at skifte kort på
    expect(await s.subscriptionLink(place, "https://assens.bynu.dk")).toBeNull();
    expect(await s.subscriptionLink(place, "https://assens.bynu.dk", "event")).toBe("https://checkout.stripe.com/c/cs_1");
    const [params, options] = calls.find((c) => c.what === "session")!.args as [
      { mode: string; customer: string; line_items: { price_data: { unit_amount: number; product: string; recurring: { interval: string } }; tax_rates: string[] }[]; subscription_data: { metadata: { pakke: string }; trial_end?: number } },
      unknown,
    ];
    expect(params.mode).toBe("subscription");
    expect(params.customer).toBe("cus_1");
    expect(params.line_items[0].price_data).toMatchObject({ unit_amount: 19900, product: "bynu_event", recurring: { interval: "month" } });
    expect(params.line_items[0].tax_rates).toEqual(["txr_1"]);
    expect((calls.find((c) => c.what === "tax")!.args[0] as { percentage: number; inclusive: boolean }).percentage).toBe(25);
    expect(params.subscription_data.metadata.pakke).toBe("event");
    expect(params.subscription_data.trial_end).toBe(Date.UTC(2027, 0, 31, 23) / 1000);
    // På ByNus egen konto, ikke restaurantens
    expect(options).toBeUndefined();

    fake.subscriptions = [{ status: "incomplete_expired", created: 1 }, { id: "sub_1", status: "trialing", created: 2, metadata: { pakke: "event" }, items: { data: [{ id: "si_1" }] } }];
    expect(await s.checkSubscription(place.slug)).toBe("active");
    const listed = (await store.adminListPlaces()).find((p) => p.slug === place.slug)!;
    expect(listed).toMatchObject({ subscription: "trialing", plan: "event" });
    expect(await s.subscriptionLink(place, "https://assens.bynu.dk")).toBe("https://billing.stripe.com/p/1");

    // Skift til Fuld pakke: samme abonnement, ny pris fra næste regning
    expect(await s.subscriptionLink(place, "https://assens.bynu.dk", "fuld")).toBe("https://assens.bynu.dk/panel?abonnement=skiftet");
    const [id, change] = calls.find((c) => c.what === "update")!.args as [string, { items: { id: string; price_data: { unit_amount: number } }[]; metadata: { pakke: string }; proration_behavior: string }];
    expect(id).toBe("sub_1");
    expect(change.items[0]).toMatchObject({ id: "si_1", price_data: { unit_amount: 34900 } });
    expect(change).toMatchObject({ metadata: { pakke: "fuld" }, proration_behavior: "none" });
    expect((await store.getSubscription(place.slug))!.plan).toBe("fuld");

    // En ekstra besked kommer på næste regning
    expect(await s.chargeExtraPush(place.slug)).toBe(true);
    expect(calls.find((c) => c.what === "invoiceItem")!.args[0]).toMatchObject({ customer: "cus_1", subscription: "sub_1", amount: 2900, currency: "dkk" });

    fake.subscriptions = [{ status: "past_due", created: 3 }];
    expect(await s.checkSubscription(place.slug)).toBe("problem");
    expect(await s.chargeExtraPush(place.slug)).toBe(false);
  });
});
