import { NextResponse } from "next/server";
import { todayInCopenhagen } from "@/lib/hours";
import { buildBooking } from "@/lib/orders";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const place = body?.slug ? await store.getPlace(String(body.slug)) : null;
  if (!place) return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });
  const result = buildBooking(place, body, todayInCopenhagen());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const booking = await store.createBooking(result.value);
  return NextResponse.json({ id: booking.id });
}
