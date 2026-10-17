import { PlaceBrowser } from "@/components/PlaceBrowser";
import { getPlaces } from "@/lib/places";

export const revalidate = 300;

export default async function Home() {
  const places = await getPlaces();
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">Hvad skal vi spise i aften?</h1>
      <p className="mt-2 text-stone-600">Alle spisesteder i Assens samlet ét sted. Se hvem der har åbent, find menuen og ring eller bestil.</p>
      <div className="mt-6">
        <PlaceBrowser places={places} />
      </div>
    </main>
  );
}
