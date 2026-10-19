import { NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { cleanDetails } from "@/lib/place-details";
import { store } from "@/lib/store";

// Telefon, åbningstider og menukort, som restauranten selv retter i panelet
export async function POST(request: Request) {
  const slug = await panelSlug();
  if (!slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const result = cleanDetails(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  try {
    await store.updatePlaceDetails(slug, result.value);
  } catch {
    return NextResponse.json({ error: "Det blev ikke gemt helt. Tryk Gem igen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
