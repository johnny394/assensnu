import { NextResponse } from "next/server";
import { buildOrder } from "@/lib/orders";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const place = body?.slug ? await store.getPlace(String(body.slug)) : null;
  if (!place) return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });
  const result = buildOrder(place, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const order = await store.createOrder(result.value);
  return NextResponse.json({ id: order.id });
}
