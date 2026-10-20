import type { Metadata } from "next";
import { Wordmark } from "@/components/AppShell";
import { Panel } from "@/components/panel/Panel";
import { PanelLogin } from "@/components/panel/PanelLogin";
import { panelSlug } from "@/lib/panel-auth";
import { isDemo, store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Restaurantpanel · AssensNu", robots: { index: false } };

export default async function PanelPage() {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;

  if (place) {
    const [orders, bookings, followers] = await Promise.all([
      store.listOrders(place.slug),
      store.listBookings(place.slug),
      store.listFollowers(place.slug).then((f) => f.length, () => null),
    ]);
    return <Panel initial={{ place, orders, bookings, followers }} noDatabase={isDemo && !!process.env.VERCEL} />;
  }

  // Alle steder kan logge ind og rette deres oplysninger, når AssensNu har givet dem en kode
  const places = await store.getPlaces();
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Wordmark />
      <h1 className="mt-8 font-display text-[2.3rem] font-extrabold leading-tight tracking-tight">Restaurantpanel</h1>
      <p className="mb-8 text-lg text-ink-soft">Her ser I nye ordrer og bordforespørgsler fra AssensNu.</p>
      {places.length ? <PanelLogin places={places.map(({ slug, name }) => ({ slug, name }))} /> : <p className="text-lg">Ingen spisesteder er sat op til panelet endnu.</p>}
      {isDemo && <p className="mt-8 text-center text-ink-soft">Afprøvning: vælg Prøvepizza og koden 1234.</p>}
    </main>
  );
}
