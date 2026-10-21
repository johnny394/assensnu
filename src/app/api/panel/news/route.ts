import { after, NextResponse } from "next/server";
import { kr } from "@/lib/format";
import { cleanNews, cleanNewsPrice, cleanWasPrice, NEWS_MAX } from "@/lib/live";
import { panelSlug } from "@/lib/panel-auth";
import { notifyFollowers } from "@/lib/push";
import { store } from "@/lib/store";
import { warmTranslations } from "@/lib/translate";
import { SITE } from "@/lib/site";

// Dagens tilbud. Første gang om dagen får følgerne en besked. Rettes teksten senere
// samme dag, ændres den bare på siden, så ingen får to beskeder på én dag.
export async function POST(request: Request) {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { text?: unknown; price?: unknown; wasPrice?: unknown } | null;
  const text = cleanNews(body?.text);
  if (!text) return NextResponse.json({ error: `Skriv en kort tekst på højst ${NEWS_MAX} tegn.` }, { status: 400 });
  const price = cleanNewsPrice(body?.price);
  if (price === undefined) return NextResponse.json({ error: "Skriv prisen i hele kroner, fx 109." }, { status: 400 });
  const was = cleanNewsPrice(body?.wasPrice);
  if (was === undefined) return NextResponse.json({ error: "Skriv normalprisen i hele kroner, fx 129." }, { status: 400 });
  if (was && (!price || was <= price)) return NextResponse.json({ error: "Normalprisen skal være højere end tilbudsprisen." }, { status: 400 });
  const wasPrice = cleanWasPrice(was, price);

  const firstToday = !place.news;
  try {
    await store.postNews(place.slug, text, price, wasPrice);
  } catch (e) {
    console.error("Kunne ikke gemme dagens tilbud", e);
    return NextResponse.json({ error: `Det kunne ikke gemmes. Ring til ${SITE}, så hjælper vi.` }, { status: 500 });
  }
  if (firstToday) after(() => notifyFollowers(place.slug, {
        title: `Dagens tilbud hos ${place.name}`,
        body: price ? `${text} · ${wasPrice ? `Nu ${kr(price)} (før ${kr(wasPrice)})` : kr(price)}${place.acceptsOrders ? ` · Bestil i ${SITE}` : ""}` : text,
        url: `/sted/${place.slug}#dagens-tilbud`,
      }));
  after(() => warmTranslations(place.slug));
  return NextResponse.json({ ok: true, notified: firstToday });
}
