import type { Order } from "./types";

// Panelets boks: Stripe-nøglen mangler på Vercel, ikke i gang, i gang hos Stripe, eller klar
export type OnlinePayState = "unavailable" | "off" | "started" | "on";

// Restauranten ser først en ordre, der skal betales online, når kunden har betalt
export const shownToPlace = (order: Pick<Order, "payment">) => !order.payment || (order.payment.status !== "pending" && order.payment.status !== "failed");

// ByNus andel af en online betaling i øre. BYNU_PROCENT=2,5 giver 5 kr. af en ordre på 200 kr.
export function bynuFee(totalKr: number, percent: string | undefined = process.env.BYNU_PROCENT): number {
  const p = Number(String(percent ?? "").trim().replace(",", "."));
  if (!Number.isFinite(p) || p <= 0 || p >= 50) return 0;
  return Math.round(totalKr * p);
}
