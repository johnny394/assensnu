import { NextResponse } from "next/server";
import { cleanLastChanceItems, lastChanceEnd } from "@/lib/last-chance";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";

// Sidste chance: halv pris på de retter, der er tilbage, indtil lukketid. Tom liste stopper det.
export async function POST(request: Request) {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { itemIds?: unknown } | null;

  if (Array.isArray(body?.itemIds) && body.itemIds.length === 0) {
    await store.setLastChance(place.slug, null);
    return NextResponse.json({ ok: true });
  }
  const end = lastChanceEnd(place);
  if (!end) return NextResponse.json({ error: "Det kan kun slås til, mens I har åbent." }, { status: 400 });
  const items = cleanLastChanceItems(place, body?.itemIds);
  if (!items.ok) return NextResponse.json({ error: items.error }, { status: 400 });
  try {
    await store.setLastChance(place.slug, { itemIds: items.value, until: end.toISOString() });
  } catch (e) {
    console.error("Kunne ikke gemme sidste chance", e);
    return NextResponse.json({ error: "Det kunne ikke gemmes. Ring til AssensNu, så hjælper vi." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
