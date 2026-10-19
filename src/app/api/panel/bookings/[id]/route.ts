import { after, NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { notify } from "@/lib/push";
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

  const name = booking.placeName;
  const message = {
    confirmed: { title: `${name}: bordet er bekræftet`, body: `I er ventet kl. ${booking.time}.` },
    declined: { title: `${name} har desværre ikke plads`, body: "Prøv en anden dag eller tid." },
    suggested: { title: `${name} foreslår kl. ${suggestedTime}`, body: "Ring og sig ja, så er det på plads." },
  }[status as "confirmed" | "declined" | "suggested"];
  after(() => notify({ kind: "booking", id: booking.id }, { ...message, url: `/booking/${booking.id}` }));
  return NextResponse.json({ ok: true });
}
