import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { cleanDetails } from "@/lib/place-details";
import { store } from "@/lib/store";

// Åbningstider og menukort, som Johnny retter i sit eget panel. Samme tjek som i restaurantpanelet.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const { slug } = await params;
  if (!(await store.adminListPlaces()).some((p) => p.slug === slug)) {
    return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });
  }
  const result = cleanDetails(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const { hours, menu } = result.value;
  if (!hours && !menu) return NextResponse.json({ error: "Der var ikke noget at gemme." }, { status: 400 });
  try {
    await store.updatePlaceDetails(slug, { hours, menu });
  } catch {
    return NextResponse.json({ error: "Det blev ikke gemt helt. Tryk Gem igen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
