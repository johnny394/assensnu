import type { PlanId } from "./plans";
import type { Order, Place } from "./types";

// Panelets boks: Stripe-nøglen mangler på Vercel, ikke i gang, i gang hos Stripe, eller klar
export type OnlinePayState = "unavailable" | "off" | "started" | "on";

// Abonnementet hos ByNu. Stripes egne ord for status gemmes, og panelet viser dem som en af disse. plan er den valgte pakke.
export type Subscription = { customer: string; status?: string; plan?: PlanId };
export type SubscriptionState = "unavailable" | "none" | "active" | "problem";
export function subscriptionState(sub: Subscription | null | undefined, stripeOn = true): SubscriptionState {
  if (!stripeOn) return "unavailable";
  const s = sub?.status;
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "problem";
  return "none";
}

// Restauranten ser først en ordre, der skal betales online, når kunden har betalt
export const shownToPlace = (order: Pick<Order, "payment">) => !order.payment || (order.payment.status !== "pending" && order.payment.status !== "failed");

// ByNus andel af en online betaling i øre. BYNU_PROCENT=2,5 giver 5 kr. af en ordre på 200 kr.
export function bynuFee(totalKr: number, percent: string | undefined = process.env.BYNU_PROCENT): number {
  const p = Number(String(percent ?? "").trim().replace(",", "."));
  if (!Number.isFinite(p) || p <= 0 || p >= 50) return 0;
  return Math.round(totalKr * p);
}

// Det, Stripe ellers spørger restauranten om, og som vi allerede ved. Kun adresser som "Østergade 12, 5610 Assens" sendes med.
export function stripeProfile(place: Pick<Place, "name" | "slug" | "address" | "phone" | "cuisines">, origin: string) {
  const m = place.address.match(/^(.+?),\s*(\d{4})\s+(.+)$/);
  const digits = (place.phone ?? "").replace(/[^\d+]/g, "");
  const phone = /^\d{8}$/.test(digits) ? `+45${digits}` : /^\+\d{8,15}$/.test(digits) ? digits : undefined;
  const food = place.cuisines.length ? ` (${place.cuisines.join(", ").toLowerCase()})` : "";
  return {
    name: place.name,
    url: `${origin}/sted/${place.slug}`,
    mcc: "5812",
    product_description: `Restaurant${food}. Kunderne bestiller takeaway og betaler online gennem ByNu.`,
    ...(phone && { support_phone: phone }),
    ...(m && { support_address: { line1: m[1].trim(), postal_code: m[2], city: m[3].trim(), country: "DK" } }),
  };
}
