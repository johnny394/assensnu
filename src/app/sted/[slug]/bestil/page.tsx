import Link from "next/link";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const place = await store.getPlace((await params).slug);
  if (!place || !place.acceptsOrders) notFound();
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <Link href={`/sted/${place.slug}`} className="inline-block py-2 text-lg text-ink-soft">
        ‹ Tilbage til menuen
      </Link>
      <h1 className="mt-2 font-display text-[2.3rem] font-extrabold leading-tight tracking-tight">Din bestilling</h1>
      <p className="text-lg text-ink-soft">Takeaway fra {place.name}</p>
      <Checkout place={place} />
    </main>
  );
}
