import "server-only";
import Stripe from "stripe";
import { bynuFee, monthlyKr, shownToPlace, stripeProfile, subscriptionState, type OnlinePayState, type SubscriptionState } from "./payment";
import { store } from "./store";
import type { Order, OrderPayment, Place } from "./types";

// Online betaling med MobilePay og kort. Hvert sted har sin egen Stripe-konto og betaler selv Stripes gebyr.
// Pengene reserveres, når kunden betaler, og trækkes først, når restauranten trykker Accepter.

let client: Stripe | null | undefined;
export function stripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    client = key ? new Stripe(key) : null;
  }
  return client;
}

// Adressen, kunden og restauranten kommer tilbage til fra Stripe, fx https://assens.bynu.dk
export function originOf(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}` : new URL(request.url).origin;
}

/** Sender kunden til Stripes betalingsside. Giver adressen, eller null hvis det ikke kan lade sig gøre. */
export async function startPayment(order: Order, origin: string): Promise<string | null> {
  const s = stripe();
  const account = await store.getStripeAccount(order.placeSlug);
  if (!s || !account) return null;
  const fee = bynuFee(order.total);
  try {
    const session = await s.checkout.sessions.create(
      {
        mode: "payment",
        locale: "auto",
        client_reference_id: order.id,
        line_items: [{ quantity: 1, price_data: { currency: "dkk", unit_amount: Math.round(order.total * 100), product_data: { name: `Ordre ${order.number} hos ${order.placeName}` } } }],
        payment_intent_data: { capture_method: "manual", description: `Ordre ${order.number}`, metadata: { order: order.id }, ...(fee > 0 && { application_fee_amount: fee }) },
        // Stripe kræver mindst 30 minutter
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${origin}/ordre/${order.id}`,
        cancel_url: `${origin}/sted/${order.placeSlug}/bestil`,
      },
      { stripeAccount: account },
    );
    await store.setOrderPayment(order.id, { status: "pending", session: session.id });
    return session.url;
  } catch (e) {
    console.error("Stripe kunne ikke starte betalingen", e);
    return null;
  }
}

/** Spørger Stripe, om kunden har betalt en ordre, der venter på betaling */
export async function syncPayment(order: Order): Promise<Order> {
  const p = order.payment;
  const s = stripe();
  if (p?.status !== "pending" || !p.session || !s) return order;
  const account = await store.getStripeAccount(order.placeSlug);
  if (!account) return order;
  const session = await s.checkout.sessions.retrieve(p.session, {}, { stripeAccount: account }).catch(() => null);
  let next: OrderPayment | null = null;
  if (session?.status === "complete") {
    const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    next = { status: "held", session: p.session, intent };
  } else if (session?.status === "expired") next = { status: "failed", session: p.session };
  if (!next) return order;
  await store.setOrderPayment(order.id, next);
  return { ...order, payment: next };
}

/** Dagens ordrer til panelet. Ordrer, der venter på betaling, tjekkes først, og ubetalte vises ikke. */
export async function ordersForPlace(slug: string): Promise<Order[]> {
  const orders = await store.listOrders(slug);
  return (await Promise.all(orders.map((o) => (o.payment?.status === "pending" ? syncPayment(o) : o)))).filter(shownToPlace);
}

/** Trækker pengene, når restauranten accepterer, eller frigiver dem, når den afviser. false = det gik ikke. */
export async function settlePayment(order: Order, accept: boolean): Promise<boolean> {
  const p = order.payment;
  if (p?.status !== "held") return true;
  const s = stripe();
  const account = await store.getStripeAccount(order.placeSlug);
  if (!s || !account || !p.intent) return false;
  try {
    let intent = await s.paymentIntents.retrieve(p.intent, {}, { stripeAccount: account });
    if (intent.status === "requires_capture") {
      intent = accept ? await s.paymentIntents.capture(p.intent, {}, { stripeAccount: account }) : await s.paymentIntents.cancel(p.intent, {}, { stripeAccount: account });
    }
    if (intent.status !== (accept ? "succeeded" : "canceled")) return false;
  } catch (e) {
    console.error("Stripe kunne ikke afslutte betalingen", e);
    return false;
  }
  await store.setOrderPayment(order.id, { ...p, status: accept ? "paid" : "released" });
  return true;
}

export async function onlinePayState(place: Place): Promise<OnlinePayState> {
  if (!stripe()) return "unavailable";
  if (place.onlinePay) return "on";
  return (await store.getStripeAccount(place.slug).catch(() => null)) ? "started" : "off";
}

/** Stripes side, hvor restauranten skriver CVR, ejer og kontonummer. Kontoen oprettes første gang. */
export async function connectLink(place: Place, origin: string): Promise<string | null> {
  const s = stripe();
  if (!s) return null;
  let account = await store.getStripeAccount(place.slug);
  if (!account) {
    const created = await s.accounts.create({
      country: "DK",
      // Stedet har sit eget Stripe-login og betaler selv Stripes gebyr
      controller: { fees: { payer: "account" }, losses: { payments: "stripe" }, stripe_dashboard: { type: "full" } },
      // Adresse, telefon og beskrivelse er udfyldt på forhånd, så Stripe ikke spørger om dem
      business_profile: stripeProfile(place, origin),
      metadata: { sted: place.slug },
    });
    account = created.id;
    await store.saveStripeAccount(place.slug, account, false);
  }
  const link = await s.accountLinks.create({
    account,
    type: "account_onboarding",
    refresh_url: `${origin}/api/panel/betaling`,
    return_url: `${origin}/api/panel/betaling?tjek=1`,
  });
  return link.url;
}

/** Spørger Stripe, om stedets konto kan tage imod penge nu, og gemmer svaret */
export async function checkAccount(slug: string): Promise<boolean> {
  const s = stripe();
  const account = await store.getStripeAccount(slug);
  if (!s || !account) return false;
  const ready = Boolean((await s.accounts.retrieve(account)).charges_enabled);
  await store.saveStripeAccount(slug, account, ready);
  return ready;
}

// Abonnementet hos ByNu. Det betales med kort på ByNus egen Stripe-konto og trækkes automatisk hver måned.
// Ingen binding: restauranten kan stoppe, når den vil, og abonnementet kører så måneden ud.

/** Stripes side, hvor restauranten skriver sit kort. Har de allerede et abonnement, kommer de til siden, hvor de kan skifte kort eller stoppe. */
export async function subscriptionLink(place: Place, origin: string): Promise<string | null> {
  const s = stripe();
  if (!s) return null;
  let sub = await store.getSubscription(place.slug);
  if (sub && subscriptionState(sub) !== "none") return billingLink(sub.customer, origin);
  if (!sub) {
    const customer = await s.customers.create({ name: place.name, metadata: { sted: place.slug } });
    sub = { customer: customer.id };
    await store.saveSubscription(place.slug, sub);
  }
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: sub.customer,
    locale: "da",
    line_items: [
      {
        quantity: 1,
        price_data: { currency: "dkk", unit_amount: Math.round(monthlyKr() * 100), recurring: { interval: "month" }, product_data: { name: `ByNu abonnement · ${place.name}` } },
      },
    ],
    subscription_data: { metadata: { sted: place.slug } },
    success_url: `${origin}/api/panel/abonnement?tjek=1`,
    cancel_url: `${origin}/panel?abonnement=fortrudt`,
  });
  return session.url;
}

/** Siden hos Stripe, hvor restauranten kan skifte kort, se kvitteringer eller stoppe abonnementet */
export async function billingLink(customer: string, origin: string): Promise<string | null> {
  const s = stripe();
  if (!s) return null;
  const session = await s.billingPortal.sessions.create({ customer, return_url: `${origin}/api/panel/abonnement?tjek=1` });
  return session.url;
}

/** Spørger Stripe, hvordan det står med stedets abonnement, og gemmer svaret */
export async function checkSubscription(slug: string): Promise<SubscriptionState> {
  const s = stripe();
  const sub = await store.getSubscription(slug).catch(() => null);
  if (!s) return "unavailable";
  if (!sub) return "none";
  const list = await s.subscriptions.list({ customer: sub.customer, status: "all", limit: 10 });
  // Det nyeste abonnement, der ikke er opgivet halvvejs, tæller
  const latest = list.data.filter((x) => x.status !== "incomplete_expired").sort((a, b) => b.created - a.created)[0];
  const next = { customer: sub.customer, ...(latest && { status: latest.status }) };
  if (next.status !== sub.status) await store.saveSubscription(slug, next);
  return subscriptionState(next);
}

/** Det, panelet viser, uden at spørge Stripe */
export async function storedSubscriptionState(slug: string): Promise<SubscriptionState> {
  return subscriptionState(await store.getSubscription(slug).catch(() => null), Boolean(stripe()));
}
