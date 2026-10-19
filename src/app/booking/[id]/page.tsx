import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BookingStatusView } from "@/components/BookingStatusView";
import { pushPublicKey } from "@/lib/push";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Din bordforespørgsel · AssensNu", robots: { index: false } };

export default async function BookingStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const booking = await store.getBooking((await params).id);
  if (!booking) notFound();
  const place = await store.getPlace(booking.placeSlug);
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pb-10 pt-6">
        <h1 className="mb-4 font-display text-[2.3rem] font-black leading-tight tracking-tight">Bord hos {booking.placeName}</h1>
        <BookingStatusView initial={booking} placePhone={place?.phone} pushKey={pushPublicKey()} />
      </main>
    </AppShell>
  );
}
