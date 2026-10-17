import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const booking = await store.getBooking((await params).id);
  return booking ? NextResponse.json(booking) : NextResponse.json({ error: "Forespørgslen findes ikke." }, { status: 404 });
}
