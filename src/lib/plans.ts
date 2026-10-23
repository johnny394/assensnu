import type { Subscription, SubscriptionState } from "./payment";
import type { Place } from "./types";

// Pakkerne, spisestederne kan vælge. Priserne er pr. måned plus moms.
export type PlanId = "basis" | "event" | "fuld";
export type Plan = { id: PlanId; name: string; kr: number; freePush: number; orders: boolean; events: boolean; lines: string[] };

export const PLANS: Record<PlanId, Plan> = {
  basis: { id: "basis", name: "Basis", kr: 99, freePush: 0, orders: false, events: false, lines: ["Menukort og åbningstider", "Bordbooking", "Dagens tilbud på jeres side"] },
  event: { id: "event", name: "Event", kr: 199, freePush: 1, orders: false, events: true, lines: ["Alt i Basis", "Læg jeres egne events ud", "1 gratis besked til følgerne om måneden"] },
  fuld: { id: "fuld", name: "Fuld pakke", kr: 349, freePush: 4, orders: true, events: true, lines: ["Alt i Event", "Takeaway, levering og online betaling", "4 gratis beskeder til følgerne om måneden"] },
};
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && v in PLANS;

// Ekstra beskeder til følgerne, når de gratis er brugt. Lægges på næste månedsregning.
export const PUSH_KR = 29;
export const MOMS = 0.25;
export const withMoms = (kr: number) => Math.round(kr * (1 + MOMS) * 100) / 100;

// Alle har Fuld pakke gratis til og med 31. januar 2027. Derefter gælder den pakke, de har valgt.
export const FREE_UNTIL = "2027-01-31";
// 1. februar 2027 kl. 00.00 i Danmark, som Stripe skal bruge, når den første betaling trækkes
export const FIRST_CHARGE = Date.UTC(2027, 0, 31, 23) / 1000;
export const inFreePeriod = (today: string) => today <= FREE_UNTIL;

/** Den pakke, stedet har valgt og betaler for (eller har kort på til efter den gratis periode) */
export function chosenPlan(sub: Subscription | null | undefined): PlanId | null {
  if (sub?.status !== "active" && sub?.status !== "trialing") return null;
  // Abonnementer fra før pakkerne havde alt med
  return sub.plan ?? "fuld";
}

/** Det, stedet kan lige nu. Uden en betalt pakke efter den gratis periode er det Basis. */
export const activePlan = (sub: Subscription | null | undefined, today: string): PlanId => (inFreePeriod(today) ? "fuld" : (chosenPlan(sub) ?? "basis"));

// Beskeder til følgerne tælles pr. måned, fx { month: "2026-11", used: 2 }
export type PushUse = { month: string; used: number };
export const usedThisMonth = (use: PushUse | null | undefined, today: string) => (use?.month === today.slice(0, 7) ? use.used : 0);
export const freePushLeft = (plan: PlanId, use: PushUse | null | undefined, today: string) => Math.max(0, PLANS[plan].freePush - usedThisMonth(use, today));

/** Stedet, som kunderne ser det med den pakke, det har. Indstillingerne gemmes, så de virker igen, hvis stedet skifter til Fuld pakke. */
export function withPlan<T extends Pick<Place, "acceptsOrders" | "delivery" | "onlinePay">>(place: T, sub: Subscription | null | undefined, today: string): T & { plan: PlanId } {
  const plan = activePlan(sub, today);
  if (PLANS[plan].orders) return { ...place, plan };
  return { ...place, plan, acceptsOrders: false, delivery: null, onlinePay: undefined };
}

// Det, panelet får at vide om pakken. pushLeft er de gratis beskeder, der er tilbage i måneden.
export type PlanSummary = { state: SubscriptionState; chosen: PlanId | null; plan: PlanId; free: boolean; pushLeft: number };
