import { NextResponse } from "next/server";
import { after } from "next/server";
import { cleanChef } from "@/lib/chef";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";
import { warmTranslations } from "@/lib/translate";

// Mød kokken: billede og et par linjer om folkene bag. Tomt navn og tom tekst fjerner det hele.
export async function POST(request: Request) {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const result = cleanChef(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  try {
    await store.setChef(place.slug, result.value.chef, result.value.photo);
  } catch (e) {
    console.error("Kunne ikke gemme Mød kokken", e);
    return NextResponse.json({ error: "Det kunne ikke gemmes. Ring til AssensNu, så hjælper vi." }, { status: 500 });
  }
  if (result.value.chef) after(() => warmTranslations(place.slug));
  return NextResponse.json({ ok: true });
}
