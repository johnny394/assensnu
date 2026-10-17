import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OrderStatusView } from "@/components/OrderStatusView";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Din bestilling · AssensNu", robots: { index: false } };

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await store.getOrder((await params).id);
  if (!order) notFound();
  const place = await store.getPlace(order.placeSlug);
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 sm:px-8 pb-10 pt-6">
        <h1 className="mb-4 font-display text-[2.3rem] font-extrabold leading-tight tracking-tight">Tak for din bestilling</h1>
        <OrderStatusView initial={order} placePhone={place?.phone} />
      </main>
    </AppShell>
  );
}
