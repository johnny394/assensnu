import { NextResponse } from "next/server";
import { cleanSubscription } from "@/lib/push";
import { store } from "@/lib/store";

// Kunden følger et sted (eller holder op) og får besked, når stedet lægger dagens ret eller et tilbud ud
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { slug?: unknown; subscription?: unknown; stop?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const subscription = cleanSubscription(body?.subscription);
  const place = slug ? await store.getPlace(slug) : null;
  if (!place?.member || !subscription) return NextResponse.json({ error: "Kunne ikke følge stedet." }, { status: 400 });
  try {
    if (body?.stop === true) await store.unfollow(slug, subscription.endpoint);
    else await store.follow(slug, subscription);
  } catch (e) {
    console.error("Kunne ikke gemme følger", e);
    return NextResponse.json({ error: "Kunne ikke følge stedet lige nu. Prøv igen senere." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
