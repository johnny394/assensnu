import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { syncPayment } from "@/lib/stripe";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const order = await store.getOrder((await params).id);
  // Kommer kunden tilbage fra betalingen, spørges Stripe, om den gik igennem
  return order ? NextResponse.json(await syncPayment(order)) : NextResponse.json({ error: "Bestillingen findes ikke." }, { status: 404 });
}
