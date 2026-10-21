import { NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { cleanSubscription } from "@/lib/push";
import { store } from "@/lib/store";

// Restaurantens telefon melder sig til (eller fra) beskeder om ordrer, ingen har svaret på
export async function POST(request: Request) {
  const slug = await panelSlug();
  if (!slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { subscription?: unknown; stop?: unknown } | null;
  const subscription = cleanSubscription(body?.subscription);
  if (!subscription) return NextResponse.json({ error: "Kunne ikke slå beskeder til." }, { status: 400 });
  try {
    await store.savePlacePush(slug, subscription, body?.stop === true);
  } catch (e) {
    console.error("Kunne ikke gemme restaurantens telefon", e);
    return NextResponse.json({ error: "Beskeder kunne ikke slås til. Er tilfoej-panel-besked.sql kørt?" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
