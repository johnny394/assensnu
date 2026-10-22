import type { Order } from "./types";

// Panelets boks: Stripe-nøglen mangler på Vercel, ikke i gang, i gang hos Stripe, eller klar
export type OnlinePayState = "unavailable" | "off" | "started" | "on";

// Abonnementet hos ByNu. Stripes egne ord for status gemmes, og panelet viser dem som en af disse.
export type Subscription = { customer: string; status?: string };
export type SubscriptionState = "unavailable" | "none" | "active" | "problem";
export function subscriptionState(sub: Subscription | null | undefined, stripeOn = true): SubscriptionState {
  if (!stripeOn) return "unavailable";
  const s = sub?.status;
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "problem";
  return "none";
}

// Månedsprisen i kroner. ABONNEMENT_KR på Vercel kan ændre den.
export function monthlyKr(value: string | undefined = process.env.ABONNEMENT_KR): number {
  const n = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 100_000 ? n : 299;
}

// Restauranten ser først en ordre, der skal betales online, når kunden har betalt
export const shownToPlace = (order: Pick<Order, "payment">) => !order.payment || (order.payment.status !== "pending" && order.payment.status !== "failed");

// ByNus andel af en online betaling i øre. BYNU_PROCENT=2,5 giver 5 kr. af en ordre på 200 kr.
export function bynuFee(totalKr: number, percent: string | undefined = process.env.BYNU_PROCENT): number {
  const p = Number(String(percent ?? "").trim().replace(",", "."));
  if (!Number.isFinite(p) || p <= 0 || p >= 50) return 0;
  return Math.round(totalKr * p);
}
