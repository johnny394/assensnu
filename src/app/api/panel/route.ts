import { after, NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { forgetOldCustomers } from "@/lib/privacy";
import { store } from "@/lib/store";
import { onlinePayState, ordersForPlace, storedSubscriptionState } from "@/lib/stripe";
import { monthlyKr } from "@/lib/payment";

// Alt, panelet viser. Hentes igen med få sekunders mellemrum.
export async function GET() {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const [orders, bookings, followers, onlinePay, subscription] = await Promise.all([
    ordersForPlace(place.slug),
    store.listBookings(place.slug),
    // Uden tilfoej-folg.sql er der ingen følgere, men resten af panelet virker
    store.listFollowers(place.slug).then((f) => f.length, () => null),
    onlinePayState(place),
    storedSubscriptionState(place.slug),
  ]);
  after(forgetOldCustomers);
  return NextResponse.json({ place, orders, bookings, followers, onlinePay, subscription: { state: subscription, kr: monthlyKr() } });
}
