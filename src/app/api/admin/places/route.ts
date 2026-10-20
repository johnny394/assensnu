import { NextResponse } from "next/server";
import { cleanBasics, makeSlug } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";
import { store } from "@/lib/store";

// Nyt spisested
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const result = cleanBasics(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const places = await store.adminListPlaces();
  const slug = makeSlug(result.value.name, places.map((p) => p.slug));
  try {
    await store.createPlace(slug, result.value);
  } catch (e) {
    console.error("Kunne ikke oprette sted", e);
    return NextResponse.json({ error: "Stedet blev ikke oprettet. Prøv igen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, slug });
}
