import { NextResponse } from "next/server";
import { cleanGroupName } from "@/lib/groups";
import { store } from "@/lib/store";

// Start en fællesbestilling. Koden får kun den, der starter, så kun han eller hun kan sende den.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const place = body?.slug ? await store.getPlace(String(body.slug)) : null;
  if (!place || !place.member) return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });
  if (!place.acceptsOrders) return NextResponse.json({ error: `${place.name} tager ikke imod bestillinger her lige nu.` }, { status: 400 });
  const name = cleanGroupName(body?.name);
  if (!name) return NextResponse.json({ error: "Skriv dit navn, så de andre kan se, hvem der har startet den." }, { status: 400 });
  const key = crypto.randomUUID();
  const group = await store.createGroup(place.slug, name, key);
  return NextResponse.json({ id: group.id, key });
}
