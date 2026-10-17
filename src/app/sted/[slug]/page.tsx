import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveOpenBadge } from "@/components/OpenBadge";
import { WEEKDAYS } from "@/lib/hours";
import { getPlace, getPlaces } from "@/lib/places";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getPlaces()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const place = await getPlace((await params).slug);
  return place ? { title: `${place.name} · AssensNu`, description: `${place.cuisines.join(", ")} i Assens. Åbningstider, menu og telefon.` } : {};
}

const kr = new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 });

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const place = await getPlace((await params).slug);
  if (!place) notFound();

  const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(place.address)}`;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">‹ Alle spisesteder</Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">{place.name}</h1>
      <p className="mt-1 text-stone-600">{place.cuisines.join(" · ")}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <LiveOpenBadge place={place} />
        {place.takeaway && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs text-orange-800">Takeaway</span>}
        {place.dineIn && <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs text-sky-800">Spis her</span>}
      </div>
      {place.description && <p className="mt-4 text-stone-700">{place.description}</p>}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {place.phone ? (
          <a href={`tel:+45${place.phone.replace(/\s/g, "")}`} className="rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-white hover:bg-stone-700">
            Ring {place.phone}
          </a>
        ) : (
          <span className="rounded-xl border border-dashed border-stone-300 px-4 py-3 text-center text-stone-500">Telefonnummer mangler</span>
        )}
        <a href={mapUrl} target="_blank" rel="noopener" className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-center font-medium text-stone-800 hover:border-stone-500">
          Vis på kort
        </a>
      </div>

      <dl className="mt-6 space-y-1 text-sm text-stone-700">
        <div><dt className="inline text-stone-500">Adresse: </dt><dd className="inline">{place.address}</dd></div>
        {place.website && <div><dt className="inline text-stone-500">Hjemmeside: </dt><dd className="inline"><a className="underline" href={place.website}>{place.website.replace(/^https?:\/\//, "")}</a></dd></div>}
        {place.facebook && <div><dt className="inline text-stone-500">Facebook: </dt><dd className="inline"><a className="underline" href={place.facebook}>Se siden</a></dd></div>}
      </dl>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900">Åbningstider</h2>
        {place.hours.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Vi mangler stadig åbningstiderne for {place.name}.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <tbody>
              {WEEKDAYS.map((name, day) => {
                const periods = place.hours.filter((h) => h.day === day);
                return (
                  <tr key={name} className="border-b border-stone-100">
                    <td className="py-1.5 text-stone-600">{name}</td>
                    <td className="py-1.5 text-right text-stone-900">
                      {periods.length ? periods.map((p) => `${p.open}–${p.close}`).join(", ") : "Lukket"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900">Menu</h2>
        {place.menu.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Menuen er ikke lagt ind endnu.</p>
        ) : (
          place.menu.map((cat) => (
            <div key={cat.name} className="mt-4">
              <h3 className="font-medium text-stone-800">{cat.name}</h3>
              <ul className="mt-1 divide-y divide-stone-100">
                {cat.items.map((item) => (
                  <li key={item.name} className="flex justify-between gap-4 py-2">
                    <div>
                      <p className="text-stone-900">{item.name}</p>
                      {item.description && <p className="text-sm text-stone-500">{item.description}</p>}
                    </div>
                    <p className="shrink-0 text-stone-900">{kr.format(item.price)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
