import { NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";
import type { BookingStatus } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const slug = await panelSlug();
  const booking = await store.getBooking((await params).id);
  if (!slug || !booking || booking.placeSlug !== slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });

  const { status, suggestedTime } = (await request.json()) as { status: BookingStatus; suggestedTime?: string };
  if (!["confirmed", "declined", "suggested"].includes(status)) return NextResponse.json({ error: "Ukendt svar." }, { status: 400 });
  if (status === "suggested" && !/^\d{2}:\d{2}$/.test(suggestedTime ?? "")) {
    return NextResponse.json({ error: "Vælg det tidspunkt, I foreslår." }, { status: 400 });
  }
  await store.setBookingStatus(booking.id, status, status === "suggested" ? suggestedTime : undefined);
  return NextResponse.json({ ok: true });
}
