import { AppShell } from "@/components/AppShell";
import { PlaceBrowser } from "@/components/PlaceBrowser";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await store.getPlaces();
  return (
    <AppShell wide>
      <main className="mx-auto max-w-5xl px-5 pt-6 sm:px-8">
        <PlaceBrowser places={places} />
      </main>
    </AppShell>
  );
}
