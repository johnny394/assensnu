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

const button = "flex min-h-14 items-center justify-center gap-2 whitespace-nowrap px-2 text-center text-lg font-bold";
const heading = "mt-10 border-t-[3px] border-double border-ink pt-2.5 font-display text-[1.7rem] font-black tracking-tight";

export default async function PlacePage({ params }: Props) {
  const place = await store.getPlace((await params).slug);
  if (!place) notFound();

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`;
  const street = place.address.replace(/, \d{4} .*/, "");

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-3">
        <Link href="/" className="inline-block py-2 text-lg text-ink-soft">
          ‹ Alle steder
        </Link>

        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="font-display text-[2.6rem] font-black leading-none tracking-tight">{place.name}</h1>
          <FavoriteButton slug={place.slug} name={place.name} />
        </div>
        <p className="mt-2 text-sm uppercase tracking-[0.1em] text-ink-soft">{[...place.cuisines, street].join(" · ")}</p>

        <div className="mt-4">
          <LiveOpenSign place={place} large />
        </div>

        {place.demo && (
          <p className="mt-5 border-2 border-dashed border-stamp bg-stamp-soft px-4 py-3 text-ink">
            Det her er et prøvested. Prøv at bestille, og se det dukke op i restaurantpanelet med koden 1234.
          </p>
        )}
        {!place.member && (
          <p className="mt-5 border-2 border-dashed border-ink-soft px-4 py-3 text-ink">
            <span className="font-bold">{place.name} er ikke med på AssensNu endnu.</span> Oplysningerne har vi selv fundet, så ring gerne og tjek, før du går derhen.
          </p>
        )}
        {place.description && !place.demo && <p className="mt-4 text-lg">{place.description}</p>}

        <div className="mt-5 grid grid-cols-3 gap-2">
          {place.phone ? (
            <a href={telLink(place.phone)} className={`${button} bg-ink text-paper`}>
              Ring
            </a>
          ) : (
            <span className={`${button} border-2 border-dashed border-ink-soft/50 whitespace-normal! text-base font-normal leading-tight text-ink-soft`}>Intet nummer endnu</span>
          )}
          {place.acceptsBookings ? (
            <Link href={`/sted/${place.slug}/book`} className={`${button} border-2 border-ink`}>
              Book bord
            </Link>
          ) : (
            <span className={`${button} whitespace-normal! border-2 border-ink-soft/40 text-base font-normal leading-tight text-ink-soft`}>{place.dineIn ? "Ring og book" : "Kun takeaway"}</span>
          )}
          <a href={mapUrl} target="_blank" rel="noopener" className={`${button} border-2 border-ink`}>
            Kort
          </a>
        </div>
        {place.phone && <p className="mt-2 text-center text-ink-soft">Telefon {place.phone}</p>}

        <h2 className={heading}>Menukortet</h2>
        {place.menu.length === 0 ? (
          <p className="mt-2 text-lg text-ink-soft">Menuen er ikke lagt ind endnu.{place.phone && " Ring og hør, hvad de har i dag."}</p>
        ) : (
          <>
            {!place.acceptsOrders && <p className="mt-1 text-ink-soft">Bestilling her kommer snart. Indtil da kan du ringe.</p>}
            <Menu place={place} />
          </>
        )}

        <h2 className={heading}>Åbningstider</h2>
        {place.hours.length === 0 ? (
          <p className="mt-2 text-lg text-ink-soft">Vi mangler stadig åbningstiderne.</p>
        ) : (
          <table className="mt-2 w-full text-lg">
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

        <h2 className={heading}>Find vej</h2>
        <div className="mt-2 text-lg">
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
