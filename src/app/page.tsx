import { AppShell } from "@/components/AppShell";
import { PlaceBrowser } from "@/components/PlaceBrowser";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await store.getPlaces();
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-8">
        <PlaceBrowser places={places} />
      </main>
    </AppShell>
  );
}
