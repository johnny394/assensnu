import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OrderStatusView } from "@/components/OrderStatusView";
import { PlaceLang } from "@/components/PlaceLang";
import { streetName } from "@/lib/badges";
import { pushPublicKey } from "@/lib/push";
import { store } from "@/lib/store";
import { syncPayment } from "@/lib/stripe";
import { pageT } from "@/lib/translate";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Din bestilling · ${SITE}`, robots: { index: false } };

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const found = await store.getOrder((await params).id);
  if (!found) notFound();
  // Tilbage fra Stripe: vis med det samme, om betalingen gik igennem
  const order = await syncPayment(found);
  const place = await store.getPlace(order.placeSlug);
  const t = await pageT();
  return (
    <PlaceLang place={place}>
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pb-10 pt-6">
        <h1 className="mb-4 font-display text-[2.3rem] font-black leading-tight tracking-tight">{t("Tak for din bestilling")}</h1>
        <OrderStatusView initial={order} placePhone={place?.phone} pushKey={pushPublicKey()} cuisines={place?.cuisines} street={place ? streetName(place.address) : ""} />
      </main>
    </AppShell>
    </PlaceLang>
  );
}
