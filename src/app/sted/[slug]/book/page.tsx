import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/BookingForm";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const place = await store.getPlace((await params).slug);
  if (!place || !place.acceptsBookings) notFound();
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <Link href={`/sted/${place.slug}`} className="inline-block py-2 text-lg text-ink-soft">
        ‹ {place.name}
      </Link>
      <h1 className="mt-2 font-display text-[2.3rem] font-black leading-tight tracking-tight">Book et bord</h1>
      <p className="text-lg text-ink-soft">hos {place.name}</p>
      <BookingForm place={place} />
    </main>
  );
}
