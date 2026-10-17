import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Menu } from "@/components/Menu";
import { Monogram } from "@/components/Monogram";
import { LiveOpenSign } from "@/components/OpenSign";
import { telLink } from "@/lib/format";
import { WEEKDAYS, copenhagenNow } from "@/lib/hours";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = await store.getPlace((await params).slug);
  return place ? { title: `${place.name} · AssensNu`, description: `${place.cuisines.join(", ")} i Assens. Åbningstider, menu og telefon.` } : {};
}

const button = "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 whitespace-nowrap rounded-[1.2rem] px-2 text-center text-[1.05rem] font-bold";
const section = "mt-10 px-1 font-display text-[1.6rem] font-extrabold tracking-[-0.03em]";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const ICON = {
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  table: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4",
  map: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
};

export default async function PlacePage({ params }: Props) {
  const place = await store.getPlace((await params).slug);
  if (!place) notFound();

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`;
  const today = copenhagenNow().day;

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-4 sm:px-8">
        <Link href="/" className="-ml-1 inline-flex items-center gap-1 rounded-full py-2 pl-1 pr-3 text-[1.05rem] font-bold text-ink-soft hover:bg-paper-deep hover:text-ink">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 5-7 7 7 7" />
          </svg>
          Alle steder
        </Link>

        <div className="mt-3 flex items-start gap-4">
          <Monogram place={place} large />
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-display text-[2.15rem] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[2.7rem]">{place.name}</h1>
            <p className="mt-1.5 text-lg text-ink-soft">{place.cuisines.join(", ")}</p>
          </div>
          <FavoriteButton slug={place.slug} name={place.name} />
        </div>

        <div className="mt-5">
          <LiveOpenSign place={place} large />
        </div>

        {place.demo && (
          <p className="mt-5 rounded-[1.2rem] bg-buoy-soft px-4 py-3 text-ink">
            Det her er et prøvested. Prøv at bestille, og se det dukke op i restaurantpanelet med koden 1234.
          </p>
        )}
        {place.description && !place.demo && <p className="mt-5 max-w-[60ch] text-lg">{place.description}</p>}

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {place.phone ? (
            <a href={telLink(place.phone)} className={`${button} bg-buoy text-ink shadow-card hover:brightness-105`}>
              <Icon d={ICON.phone} />
              Ring
            </a>
          ) : (
            <span className={`${button} border-2 border-dashed border-line text-base font-normal text-ink-soft`}>Intet nummer endnu</span>
          )}
          {place.acceptsBookings ? (
            <Link href={`/sted/${place.slug}/book`} className={`${button} bg-ink text-white shadow-card hover:bg-sea`}>
              <Icon d={ICON.table} />
              Book bord
            </Link>
          ) : (
            <span className={`${button} border-2 border-dashed border-line text-base font-normal text-ink-soft`}>{place.dineIn ? "Ring og book" : "Kun takeaway"}</span>
          )}
          <a href={mapUrl} target="_blank" rel="noopener" className={`${button} bg-surface text-ink shadow-card hover:shadow-lift`}>
            <Icon d={ICON.map} />
            Kort
          </a>
        </div>
        {place.phone && <p className="mt-2.5 text-center text-ink-soft tabular-nums">Telefon {place.phone}</p>}

        <h2 className={section}>Menu</h2>
        {place.menu.length === 0 ? (
          <p className="mt-3 rounded-[1.4rem] border-2 border-dashed border-line px-5 py-5 text-lg text-ink-soft">
            Menuen er ikke lagt ind endnu.{place.phone && " Ring og hør, hvad de har i dag."}
          </p>
        ) : (
          <>
            {!place.acceptsOrders && <p className="mt-1 px-1 text-ink-soft">Bestilling her kommer snart. Indtil da kan du ringe.</p>}
            <Menu place={place} />
          </>
        )}

        <h2 className={section}>Åbningstider</h2>
        <div className="mt-3 rounded-[1.4rem] bg-surface px-2 py-2 shadow-card">
          {place.hours.length === 0 ? (
            <p className="px-3 py-2 text-lg text-ink-soft">Vi mangler stadig åbningstiderne.</p>
          ) : (
            <table className="w-full text-lg">
              <tbody>
                {WEEKDAYS.map((name, day) => {
                  const periods = place.hours.filter((h) => h.day === day);
                  const isToday = day === today;
                  return (
                    <tr key={name} className={isToday ? "bg-buoy-soft font-bold" : ""}>
                      <td className={`py-2 pl-3 ${isToday ? "rounded-l-xl text-ink" : "text-ink-soft"}`}>
                        {name}
                        {isToday && <span className="ml-2 text-sm text-buoy-deep">i dag</span>}
                      </td>
                      <td className={`py-2 pr-3 text-right tabular-nums ${isToday ? "rounded-r-xl" : ""}`}>
                        {periods.length ? periods.map((p) => `${p.open}–${p.close}`).join(", ") : "Lukket"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <h2 className={section}>Find vej</h2>
        <div className="mt-3 rounded-[1.4rem] bg-surface px-5 py-4 text-lg shadow-card">
          <p>{place.address}</p>
          {place.website && (
            <a className="mt-1 block font-bold text-sea underline decoration-2 underline-offset-4 hover:text-ink" href={place.website}>
              Stedets egen hjemmeside
            </a>
          )}
          {place.facebook && (
            <a className="mt-1 block font-bold text-sea underline decoration-2 underline-offset-4 hover:text-ink" href={place.facebook}>
              Stedet på Facebook
            </a>
          )}
        </div>
        <div className="h-24" />
      </main>
    </AppShell>
  );
}
