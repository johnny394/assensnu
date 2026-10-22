import { NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";
import { checkAccount, connectLink, originOf } from "@/lib/stripe";

// "Slå online betaling til" i panelet. Sender restauranten over til Stripe, hvor de skriver CVR, ejer og kontonummer.
// Stripe sender dem tilbage hertil med ?tjek=1, og så ser vi, om kontoen er klar.
export async function GET(request: Request) {
  const origin = originOf(request);
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.redirect(`${origin}/panel`, 303);
  try {
    if (new URL(request.url).searchParams.has("tjek")) {
      const ready = await checkAccount(place.slug);
      return NextResponse.redirect(`${origin}/panel?betaling=${ready ? "klar" : "venter"}`, 303);
    }
    const url = await connectLink(place, origin);
    return NextResponse.redirect(url ?? `${origin}/panel?betaling=fejl`, 303);
  } catch (e) {
    console.error("Stripe-forbindelsen gik ikke", e);
    return NextResponse.redirect(`${origin}/panel?betaling=fejl`, 303);
  }
}
