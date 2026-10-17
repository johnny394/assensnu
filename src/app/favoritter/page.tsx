import { AppShell } from "@/components/AppShell";
import { Favorites } from "@/components/Favorites";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const places = await store.getPlaces();
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-8">
        <Favorites places={places} />
      </main>
    </AppShell>
  );
}
