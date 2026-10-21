import { after, NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { notify } from "@/lib/push";
import { store } from "@/lib/store";
import type { T } from "@/lib/i18n";
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

  const navn = booking.placeName;
  const message = (t: T) =>
    ({
      confirmed: { title: t("{navn}: bordet er bekræftet", { navn }), body: t("I er ventet kl. {tid}.", { tid: booking.time }) },
      declined: { title: t("{navn} har desværre ikke plads", { navn }), body: t("Prøv en anden dag eller tid.") },
      suggested: { title: t("{navn} foreslår kl. {tid}", { navn, tid: suggestedTime! }), body: t("Ring og sig ja, så er det på plads.") },
    })[status as "confirmed" | "declined" | "suggested"];
  after(() => notify({ kind: "booking", id: booking.id }, (t) => ({ ...message(t), url: `/booking/${booking.id}` })));
  return NextResponse.json({ ok: true });
}
