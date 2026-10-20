import { after, NextResponse } from "next/server";
import { kr } from "@/lib/format";
import { cleanNews, cleanNewsPrice, NEWS_MAX } from "@/lib/live";
import { panelSlug } from "@/lib/panel-auth";
import { notifyFollowers } from "@/lib/push";
import { store } from "@/lib/store";

// Dagens ret eller tilbud. Første gang om dagen får følgerne en besked. Rettes teksten senere
// samme dag, ændres den bare på siden, så ingen får to beskeder på én dag.
export async function POST(request: Request) {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { text?: unknown; price?: unknown } | null;
  const text = cleanNews(body?.text);
  if (!text) return NextResponse.json({ error: `Skriv en kort tekst på højst ${NEWS_MAX} tegn.` }, { status: 400 });
  const price = cleanNewsPrice(body?.price);
  if (price === undefined) return NextResponse.json({ error: "Skriv prisen i hele kroner, fx 109." }, { status: 400 });

  const firstToday = !place.news;
  try {
    await store.postNews(place.slug, text, price);
  } catch (e) {
    console.error("Kunne ikke gemme dagens ret", e);
    return NextResponse.json({ error: "Det kunne ikke gemmes. Ring til AssensNu, så hjælper vi." }, { status: 500 });
  }
  if (firstToday) after(() => notifyFollowers(place.slug, { title: place.name, body: price && place.acceptsOrders ? `${text} · ${kr(price)} · Bestil i AssensNu` : text, url: `/sted/${place.slug}#dagens-ret` }));
  return NextResponse.json({ ok: true, notified: firstToday });
}
