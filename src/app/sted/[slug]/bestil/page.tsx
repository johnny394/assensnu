import Link from "next/link";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { PlaceLang } from "@/components/PlaceLang";
import { store } from "@/lib/store";
import { pageT } from "@/lib/translate";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const place = await store.getPlace((await params).slug);
  if (!place || !place.member || !place.acceptsOrders) notFound();
  const t = await pageT();
  return (
    <PlaceLang place={place}>
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <Link href={`/sted/${place.slug}`} className="inline-block py-2 text-lg text-ink-soft">
        {t("‹ Tilbage til menuen")}
      </Link>
      <h1 className="mt-2 font-display text-[2.3rem] font-black leading-tight tracking-tight">{t("Din bestilling")}</h1>
      <p className="text-lg text-ink-soft">{t("Takeaway fra {navn}", { navn: place.name })}</p>
      <Checkout place={place} />
    </main>
    </PlaceLang>
  );
}
