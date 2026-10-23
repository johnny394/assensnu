import { after, NextResponse } from "next/server";
import { kr } from "@/lib/format";
import { cleanNews, cleanNewsPrice, cleanWasPrice, NEWS_MAX } from "@/lib/live";
import { panelSlug } from "@/lib/panel-auth";
import { notifyFollowers } from "@/lib/push";
import { todayInCopenhagen } from "@/lib/hours";
import { chosenPlan, freePushLeft, usedThisMonth } from "@/lib/plans";
import { store } from "@/lib/store";
import { chargeExtraPush } from "@/lib/stripe";
import { warmTranslations } from "@/lib/translate";
import { SITE } from "@/lib/site";

// Dagens tilbud. Første gang om dagen kan følgerne få en besked. Rettes teksten senere
// samme dag, ændres den bare på siden, så ingen får to beskeder på én dag.
export async function POST(request: Request) {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { text?: unknown; price?: unknown; wasPrice?: unknown; push?: unknown } | null;
  const text = cleanNews(body?.text);
  if (!text) return NextResponse.json({ error: `Skriv en kort tekst på højst ${NEWS_MAX} tegn.` }, { status: 400 });
  const price = cleanNewsPrice(body?.price);
  if (price === undefined) return NextResponse.json({ error: "Skriv prisen i hele kroner, fx 109." }, { status: 400 });
  const was = cleanNewsPrice(body?.wasPrice);
  if (was === undefined) return NextResponse.json({ error: "Skriv normalprisen i hele kroner, fx 129." }, { status: 400 });
  if (was && (!price || was <= price)) return NextResponse.json({ error: "Normalprisen skal være højere end tilbudsprisen." }, { status: 400 });
  const wasPrice = cleanWasPrice(was, price);

  // Første gang om dagen kan der sendes en besked til følgerne. De gratis tælles pr. måned, og resten koster ekstra.
  const firstToday = !place.news;
  const today = todayInCopenhagen();
  const followers = firstToday && body?.push !== false ? await store.listFollowers(place.slug).then((f) => f.length, () => 0) : 0;
  const use = followers ? await store.getPushUse(place.slug).catch(() => null) : null;
  const paid = followers > 0 && freePushLeft(place.plan ?? "fuld", use, today) === 0;
  if (paid && !chosenPlan(await store.getSubscription(place.slug).catch(() => null))) {
    return NextResponse.json({ error: "I har brugt jeres gratis beskeder i denne måned. Vælg en pakke under Jeres pakke for at sende flere, eller læg tilbuddet ud uden besked." }, { status: 400 });
  }
  try {
    await store.postNews(place.slug, text, price, wasPrice);
  } catch (e) {
    console.error("Kunne ikke gemme dagens tilbud", e);
    return NextResponse.json({ error: `Det kunne ikke gemmes. Ring til ${SITE}, så hjælper vi.` }, { status: 500 });
  }
  let notified = followers > 0;
  if (paid) {
    notified = await chargeExtraPush(place.slug).catch((e) => (console.error("Kunne ikke lægge den ekstra besked på regningen", e), false));
  }
  if (notified) await store.savePushUse(place.slug, { month: today.slice(0, 7), used: usedThisMonth(use, today) + 1 }).catch((e) => console.error("Kunne ikke tælle beskeden", e));
  if (notified) after(() => notifyFollowers(place.slug, {
        title: `Dagens tilbud hos ${place.name}`,
        body: price ? `${text} · ${wasPrice ? `Nu ${kr(price)} (før ${kr(wasPrice)})` : kr(price)}${place.acceptsOrders ? ` · Bestil i ${SITE}` : ""}` : text,
        url: `/sted/${place.slug}#dagens-tilbud`,
      }));
  after(() => warmTranslations(place.slug));
  return NextResponse.json({ ok: true, notified, ...(paid && !notified && { error: "Tilbuddet er lagt ud, men beskeden til følgerne kunne ikke sendes." }) });
}
