import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Menu } from "@/components/Menu";
import { LiveOpenSign } from "@/components/OpenSign";
import { telLink } from "@/lib/format";
import { WEEKDAYS } from "@/lib/hours";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = await store.getPlace((await params).slug);
  return place ? { title: `${place.name} · AssensNu`, description: `${place.cuisines.join(", ")} i Assens. Åbningstider, menu og telefon.` } : {};
}

const button = "flex min-h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-2 text-center text-lg font-bold";

export default async function PlacePage({ params }: Props) {
  const place = await store.getPlace((await params).slug);
  if (!place) notFound();

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`;

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-5">
        <Link href="/" className="inline-block py-2 text-lg text-ink-soft">
          ‹ Alle steder
        </Link>

        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[2.3rem] font-extrabold leading-[1.05] tracking-tight">{place.name}</h1>
            <p className="mt-1 text-lg text-ink-soft">{place.cuisines.join(", ")}</p>
          </div>
          <FavoriteButton slug={place.slug} name={place.name} />
        </div>

        <div className="mt-4">
          <LiveOpenSign place={place} large />
        </div>

        {place.demo && (
          <p className="mt-4 rounded-2xl bg-buoy-soft px-4 py-3 text-ink">
            Det her er et prøvested. Prøv at bestille, og se det dukke op i restaurantpanelet med koden 1234.
          </p>
        )}
        {place.description && !place.demo && <p className="mt-4 text-lg">{place.description}</p>}

        <div className="mt-5 grid grid-cols-3 gap-2">
          {place.phone ? (
            <a href={telLink(place.phone)} className={`${button} bg-buoy text-ink`}>
              Ring
            </a>
          ) : (
            <span className={`${button} border-2 border-dashed border-line text-base font-normal text-ink-soft`}>Intet nummer endnu</span>
          )}
          {place.acceptsBookings ? (
            <Link href={`/sted/${place.slug}/book`} className={`${button} bg-ink text-white`}>
              Book bord
            </Link>
          ) : (
            <span className={`${button} border-2 border-line text-base font-normal text-ink-soft`}>{place.dineIn ? "Ring og book" : "Kun takeaway"}</span>
          )}
          <a href={mapUrl} target="_blank" rel="noopener" className={`${button} border-2 border-line bg-surface text-ink`}>
            Kort
          </a>
        </div>
        {place.phone && <p className="mt-2 text-center text-ink-soft">Telefon {place.phone}</p>}

        <h2 className="mt-9 px-1 font-display text-2xl font-extrabold tracking-tight">Menu</h2>
        {place.menu.length === 0 ? (
          <p className="mt-2 rounded-3xl bg-surface px-5 py-5 text-lg text-ink-soft">
            Menuen er ikke lagt ind endnu.{place.phone && " Ring og hør, hvad de har i dag."}
          </p>
        ) : (
          <>
            {!place.acceptsOrders && <p className="mt-1 px-1 text-ink-soft">Bestilling her kommer snart. Indtil da kan du ringe.</p>}
            <Menu place={place} />
          </>
        )}

        <h2 className="mt-9 px-1 font-display text-2xl font-extrabold tracking-tight">Åbningstider</h2>
        <div className="mt-2 rounded-3xl bg-surface px-5 py-3">
          {place.hours.length === 0 ? (
            <p className="py-2 text-lg text-ink-soft">Vi mangler stadig åbningstiderne.</p>
          ) : (
            <table className="w-full text-lg">
              <tbody>
                {WEEKDAYS.map((name, day) => {
                  const periods = place.hours.filter((h) => h.day === day);
                  return (
                    <tr key={name} className="border-b border-line last:border-b-0">
                      <td className="py-2 text-ink-soft">{name}</td>
                      <td className="py-2 text-right tabular-nums">{periods.length ? periods.map((p) => `${p.open}–${p.close}`).join(", ") : "Lukket"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="mt-9 px-1 font-display text-2xl font-extrabold tracking-tight">Find vej</h2>
        <div className="mt-2 rounded-3xl bg-surface px-5 py-4 text-lg">
          <p>{place.address}</p>
          {place.website && (
            <a className="mt-1 block font-bold text-sea underline" href={place.website}>
              Stedets egen hjemmeside
            </a>
          )}
          {place.facebook && (
            <a className="mt-1 block font-bold text-sea underline" href={place.facebook}>
              Stedet på Facebook
            </a>
          )}
        </div>
        <div className="h-24" />
      </main>
    </AppShell>
  );
}
