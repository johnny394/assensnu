import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/BookingForm";
import { store } from "@/lib/store";
import { pageT } from "@/lib/translate";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

// Fra "Spis før koncerten" kommer dag, tid og en besked med i adressen
export default async function BookPage({ params, searchParams }: Props) {
  const place = await store.getPlace((await params).slug);
  if (!place || !place.member || !place.acceptsBookings) notFound();
  const t = await pageT();
  const q = await searchParams;
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <Link href={`/sted/${place.slug}`} className="inline-block py-2 text-lg text-ink-soft">
        ‹ {place.name}
      </Link>
      <h1 className="mt-2 font-display text-[2.3rem] font-black leading-tight tracking-tight">{t("Book et bord")}</h1>
      <p className="text-lg text-ink-soft">{t("hos {navn}", { navn: place.name })}</p>
      <BookingForm place={place} initial={{ date: q.dato, time: q.tid, note: q.note?.slice(0, 300) }} />
    </main>
  );
}
