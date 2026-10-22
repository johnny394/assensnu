import { NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";
import { checkSubscription, originOf, subscriptionLink } from "@/lib/stripe";

// Abonnementet i panelet. Uden ?tjek sendes restauranten til Stripe for at skrive sit kort (eller skifte kort og stoppe).
// Stripe sender dem tilbage hertil med ?tjek=1, og så ser vi, hvordan det står.
export async function GET(request: Request) {
  const origin = originOf(request);
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.redirect(`${origin}/panel`, 303);
  try {
    if (new URL(request.url).searchParams.has("tjek")) {
      const state = await checkSubscription(place.slug);
      return NextResponse.redirect(`${origin}/panel?abonnement=${state === "active" ? "ok" : state === "problem" ? "problem" : "slut"}`, 303);
    }
    const url = await subscriptionLink(place, origin);
    return NextResponse.redirect(url ?? `${origin}/panel?abonnement=fejl`, 303);
  } catch (e) {
    console.error("Stripe-abonnementet gik ikke", e);
    return NextResponse.redirect(`${origin}/panel?abonnement=fejl`, 303);
  }
}
