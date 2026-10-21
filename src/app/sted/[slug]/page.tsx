import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FollowButton } from "@/components/FollowButton";
import { GroupLink } from "@/components/GroupLink";
import { LangSwitch, RefreshWhileTranslating } from "@/components/LangSwitch";
import { Menu } from "@/components/Menu";
import { LastChanceOffer } from "@/components/LastChanceOffer";
import { LiveOpenSign } from "@/components/OpenSign";
import { TakeawayWait } from "@/components/TakeawayWait";
import { TodaysOffer } from "@/components/TodaysOffer";
import { LangProvider } from "@/components/useLang";
import { isAdmin } from "@/lib/admin-auth";
import { telLink } from "@/lib/format";
import { WEEKDAYS } from "@/lib/hours";
import { chefPhotoUrl } from "@/lib/chef";
import { translator } from "@/lib/i18n";
import { todaysDish } from "@/lib/live";
import { pushPublicKey } from "@/lib/push";
import { store } from "@/lib/store";
import { chooseLang, translatePlace } from "@/lib/translate";

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
  // Steder, der ikke er med endnu, er låst for kunderne. Johnny kan stadig se siden fra sit panel.
  const preview = !place.member;
  if (preview && !(await isAdmin())) redirect("/");

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`;
  const dish = todaysDish(place.news);
  const street = place.address.replace(/, \d{4} .*/, "");
  const lang = await chooseLang();
  const translation = await translatePlace(place, lang);
  const t = translator(lang, translation.texts);
  const tourist = lang !== "da";

  return (
    <LangProvider lang={lang} texts={translation.texts}>
      <AppShell>
      <main lang={lang} className="mx-auto max-w-2xl px-5 pt-3">
        <Link href="/" className="inline-block py-2 text-lg text-ink-soft">
          {t("‹ Alle steder")}
        </Link>

        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="font-display text-[2.6rem] font-black leading-none tracking-tight">{place.name}</h1>
          <FavoriteButton slug={place.slug} name={place.name} />
        </div>
        <p className="mt-2 text-sm uppercase tracking-[0.1em] text-ink-soft">{[...place.cuisines.map((c) => t(c)), street].join(" · ")}</p>

        <div className="mt-4">
          <LiveOpenSign place={place} large />
          <TakeawayWait place={place} />
        </div>
        <LangSwitch />

        <TodaysOffer place={place} t={t} />
        <LastChanceOffer place={place} />

        {place.demo && (
          <p className="mt-5 border-2 border-dashed border-stamp bg-stamp-soft px-4 py-3 text-ink">
            Det her er et prøvested. Prøv at bestille, og se det dukke op i restaurantpanelet med koden 1234.
          </p>
        )}
        {preview && (
          <p className="mt-5 border-2 border-dashed border-stamp bg-stamp-soft px-4 py-3 text-ink">
            <span className="font-bold">Kun du kan se denne side.</span> Kunderne ser {place.name} som låst med &quot;Kommer snart&quot;, til stedet får en kode i dit panel.
          </p>
        )}
        {place.description && !place.demo && <p className="mt-4 text-lg">{t(place.description)}</p>}

        <div className="mt-5 grid grid-cols-3 gap-2">
          {place.phone ? (
            <a href={telLink(place.phone)} className={`${button} bg-ink text-paper`}>
              {t("Ring")}
            </a>
          ) : (
            <span className={`${button} border-2 border-dashed border-ink-soft/50 whitespace-normal! text-base font-normal leading-tight text-ink-soft`}>{t("Intet nummer endnu")}</span>
          )}
          {place.acceptsBookings ? (
            <Link href={`/sted/${place.slug}/book`} className={`${button} border-2 border-ink`}>
              {t("Book bord")}
            </Link>
          ) : (
            <span className={`${button} whitespace-normal! border-2 border-ink-soft/40 text-base font-normal leading-tight text-ink-soft`}>{t(place.dineIn ? "Ring og book" : "Kun takeaway")}</span>
          )}
          <a href={mapUrl} target="_blank" rel="noopener" className={`${button} border-2 border-ink`}>
            {t("Kort")}
          </a>
        </div>
        {place.phone && <p className="mt-2 text-center text-ink-soft">{t("Telefon {phone}", { phone: place.phone })}</p>}
        {!preview && <FollowButton slug={place.slug} name={place.name} publicKey={pushPublicKey()} />}

        <h2 className={heading}>{t("Menukortet")}</h2>
        {tourist && place.menu.length > 0 && (
          <div className="mt-2 border-2 border-dashed border-ink-soft/60 px-4 py-3 text-ink-soft">
            {translation.state === "done" && <p>{t("Menuen er oversat automatisk. Navnet på dansk står under, så du kan sige det til restauranten.")}</p>}
            {translation.state === "working" && (
              <p className="font-bold text-ink">
                {t("Menuen bliver oversat lige nu. Om lidt står den på engelsk.")}
                <RefreshWhileTranslating lang={lang} />
              </p>
            )}
            {translation.state === "off" && <p>{t("Menuen kan ikke oversættes lige nu, så den står på dansk.")}</p>}
          </div>
        )}
        {place.menu.length === 0 ? (
          <>
            <p className="mt-2 text-lg text-ink-soft">
              {t("Menuen er ikke lagt ind endnu.")}
              {place.phone && t(" Ring og hør, hvad de har i dag.")}
            </p>
            {/* Kurven nederst, så dagens tilbud kan bestilles, selv om resten af menuen mangler */}
            {dish && <Menu place={place} />}
          </>
        ) : (
          <>
            {!place.acceptsOrders && <p className="mt-1 text-ink-soft">{t("Bestilling her kommer snart. Indtil da kan du ringe.")}</p>}
            {place.acceptsOrders && !preview && <GroupLink slug={place.slug} />}
            <Menu place={place} />
          </>
        )}

        {place.chef && (
          <>
            <h2 className={heading}>{t("Mød kokken")}</h2>
            <figure className="mt-3 flex items-start gap-4">
              {chefPhotoUrl(place.slug, place.chef) && (
                <img
                  src={chefPhotoUrl(place.slug, place.chef)!}
                  alt={place.chef.name}
                  className="h-32 w-28 shrink-0 border-2 border-ink object-cover grayscale-[35%] sepia-[15%]"
                />
              )}
              <figcaption>
                <p className="font-display text-xl font-black leading-tight">{place.chef.name}</p>
                <p className="mt-1 whitespace-pre-line text-lg leading-snug">{t(place.chef.text)}</p>
              </figcaption>
            </figure>
          </>
        )}

        <h2 className={heading}>{t("Åbningstider")}</h2>
        {place.hours.length === 0 ? (
          <p className="mt-2 text-lg text-ink-soft">{t("Vi mangler stadig åbningstiderne.")}</p>
        ) : (
          <table className="mt-2 w-full text-lg">
            <tbody>
              {WEEKDAYS.map((name, day) => {
                const periods = place.hours.filter((h) => h.day === day);
                return (
                  <tr key={name} className="border-b border-line last:border-b-0">
                    <td className="py-2 text-ink-soft">{t(name)}</td>
                    <td className="py-2 text-right tabular-nums">{periods.length ? periods.map((p) => `${p.open}–${p.close}`).join(", ") : t("Lukket")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <h2 className={heading}>{t("Find vej")}</h2>
        <div className="mt-2 text-lg">
          <p>{place.address}</p>
          {place.website && (
            <a className="mt-1 block font-bold text-sea underline" href={place.website}>
              {t("Stedets egen hjemmeside")}
            </a>
          )}
          {place.facebook && (
            <a className="mt-1 block font-bold text-sea underline" href={place.facebook}>
              {t("Stedet på Facebook")}
            </a>
          )}
        </div>
        <div className="h-24" />
      </main>
      </AppShell>
    </LangProvider>
  );
}
