"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import { pickupOptions } from "@/lib/hours";
import { pickupKey } from "./PickupLink";
import { slotsByHour } from "@/lib/later";
import { choiceText, parseKey, priceChoice } from "@/lib/menu-options";
import { CAMPSITE } from "@/lib/orders";
import { townName } from "@/lib/postcodes";
import type { OrderLine, Place } from "@/lib/types";
import { useCart } from "./useCart";
import { hostKey, leaveGroup } from "./useGroup";
import { noteKey, readStored, writeStored } from "./useStored";
import { useLang } from "./useLang";
import { useNow } from "./useNow";

const CUSTOMER_KEY = "assensnu:kunde";

export const field = "w-full border-2 border-ink bg-surface px-4 py-3.5 text-lg outline-none focus:border-stamp";
export const label = "mb-1.5 block text-lg font-bold";

// Med group sendes en fællesbestilling: maden kommer fra den, ikke fra kurven på telefonen
export function Checkout({ place, group }: { place: Place; group?: { id: string; lines: OrderLine[] } }) {
  const router = useRouter();
  const now = useNow();
  const { cart, change, clear } = useCart(place.slug);
  const [pickup, setPickup] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  // Hent selv, kør ud til en adresse, ned til båden i havnen eller ud på campingpladsen
  const [mode, setMode] = useState<"pickup" | "door" | "boat" | "camp">("pickup");
  const delivering = mode !== "pickup";
  const [spot, setSpot] = useState<"jetty" | "office">("jetty");
  const [jetty, setJetty] = useState("");
  const [boat, setBoat] = useState("");
  const [campSpot, setCampSpot] = useState<"pitch" | "reception">("pitch");
  const [pitch, setPitch] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  // Betal nu med MobilePay eller kort, hvis stedet har slået det til. Fællesbestillinger betales ved afhentning.
  const canPayOnline = !!place.onlinePay && !group;
  const [pay, setPay] = useState<"online" | "later">("online");
  const online = canPayOnline && pay === "online";
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { t } = useLang();

  // Husk navn og telefon fra sidst, så man ikke skal skrive det igen
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
      setName(saved.name ?? "");
      setPhone(saved.phone ?? "");
      setAddress(saved.address ?? "");
      setPostcode(saved.postcode ?? "");
      setJetty(saved.jetty ?? "");
      setBoat(saved.boat ?? "");
      setPitch(saved.pitch ?? "");
    } catch {}
    // Fra allergidetektiven: "Uden fløde, tak" står allerede i beskeden til køkkenet
    const draft = readStored<string>(noteKey(place.slug), "");
    if (typeof draft === "string" && draft) setNote(draft);
  }, [place.slug]);

  // Fra "Spis før koncerten": maden skal være klar til et bestemt tidspunkt
  const [wantedPickup, setWantedPickup] = useState<string | null>(null);
  useEffect(() => {
    try {
      setWantedPickup(sessionStorage.getItem(pickupKey(place.slug)));
    } catch {}
  }, [place.slug]);

  const lines: (OrderLine & { key: string })[] = group
    ? group.lines.map((l, i) => ({ ...l, key: String(i) }))
    : Object.entries(cart).flatMap(([key, quantity]) => {
        const p = priceChoice(place, parseKey(key));
        if (!p.ok || p.value.item.soldOut) return [];
        const { item: _item, ...line } = p.value; // eslint-disable-line @typescript-eslint/no-unused-vars
        return [{ key, quantity, ...line }];
      });
  const food = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const delivery = place.delivery ?? null;
  const fee = delivering && delivery ? delivery.fee : 0;
  const total = food + fee;
  const missing = delivering && delivery ? delivery.minimum - food : 0;
  const modes: (typeof mode)[] = delivery ? ["pickup", ...(delivery.postcodes.length ? (["door"] as const) : []), ...(delivery.harbour ? (["boat"] as const) : []), ...(delivery.camping ? (["camp"] as const) : [])] : [];
  const boatPlace = spot === "office" ? t("havnekontoret") : jetty.trim() && boat.trim() ? t("bro {bro}, båden {baad}", { bro: jetty.trim().replace(/^bro\s*/i, ""), baad: boat.trim() }) : t("båden");
  const campPlace = campSpot === "reception" ? t("receptionen på {camp}", { camp: CAMPSITE }) : pitch.trim() ? t("plads {plads} på {camp}", { plads: pitch.trim().replace(/^plads\s*/i, ""), camp: CAMPSITE }) : t("din plads på {camp}", { camp: CAMPSITE });
  const zip = delivery?.postcodes.includes(postcode) ? postcode : delivery?.postcodes.length === 1 ? delivery.postcodes[0] : "";
  const options = now ? pickupOptions(place, now) : null;
  const chosen = pickup ?? (options?.asapMinutes != null ? "asap" : options?.slots[0] ?? null);
  const later = options?.slots ?? [];
  useEffect(() => {
    if (wantedPickup && pickup === null && later.includes(wantedPickup)) setPickup(wantedPickup);
  }, [wantedPickup, pickup, later]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: place.slug,
        items: group ? [] : lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, size: l.size, extras: l.extras })),
        ...(group && { group: { id: group.id, key: hostKey(group.id) } }),
        name,
        phone,
        pickup: chosen,
        note,
        delivery: mode === "door" ? { address, postcode: zip } : mode === "boat" ? { harbour: spot, jetty, boat } : mode === "camp" ? { camping: campSpot, pitch } : null,
        pay: online ? "online" : "later",
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(t(data?.error ?? "Bestillingen blev ikke sendt. Tjek din forbindelse og prøv igen."));
      setSending(false);
      return;
    }
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone, address, postcode: zip || postcode, jetty, boat, pitch }));
    } catch {}
    writeStored(noteKey(place.slug), null);
    // Til Stripe for at betale. Kurven bliver liggende, til betalingen er gået igennem, så den er der, hvis kunden fortryder.
    if (data.payUrl) {
      window.location.href = data.payUrl;
      return;
    }
    if (group) leaveGroup(place.slug, group.id);
    else clear();
    router.push(`/ordre/${data.id}`);
  }

  if (lines.length === 0 && group) {
    return (
      <div className="mt-6 border-y-[3px] border-double border-ink px-5 py-8 text-center text-lg">
        <p>{t("Der er ikke lagt noget mad i fællesbestillingen endnu.")}</p>
        <Link href={`/faelles/${group.id}`} className="mt-3 inline-block font-bold text-ink underline decoration-stamp decoration-2 underline-offset-4">
          {t("Tilbage til fællesbestillingen")}
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-6 border-y-[3px] border-double border-ink px-5 py-8 text-center text-lg">
        <p>{t("Kurven er tom.")}</p>
        <Link href={`/sted/${place.slug}`} className="mt-3 inline-block font-bold text-ink underline decoration-stamp decoration-2 underline-offset-4">
          {t("Se menuen hos {navn}", { navn: place.name })}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="mt-6 space-y-8">
      <section>
        <ul className="border-t-[3px] border-double border-ink">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3 border-b border-line px-1 py-3">
              {group ? (
                <span className="w-8 shrink-0 text-lg font-bold">{l.quantity} ×</span>
              ) : (
              <div className="flex shrink-0 items-center gap-1 rounded-full border-2 border-ink">
                <button type="button" onClick={() => change(l.key, -1)} aria-label={t("Fjern en {navn}", { navn: t(l.name) })} className="h-10 w-10 text-xl">
                  −
                </button>
                <span className="w-5 text-center font-bold">{l.quantity}</span>
                <button type="button" onClick={() => change(l.key, 1)} aria-label={t("Læg en {navn} mere i kurven", { navn: t(l.name) })} className="h-10 w-10 text-xl">
                  +
                </button>
              </div>
              )}
              <span className="min-w-0 flex-1 text-lg">
                {l.person && <span className="block text-base font-bold">{l.person}</span>}
                {t(l.name)}
                {choiceText(l) && <span className="block text-base text-ink-soft">{choiceText(l, t)}</span>}
              </span>
              <span className="text-lg tabular-nums">{kr(l.price * l.quantity)}</span>
            </li>
          ))}
          {fee > 0 && (
            <li className="flex justify-between border-b border-line px-1 py-3 text-lg">
              <span>{t("Levering")}</span>
              <span className="tabular-nums">{kr(fee)}</span>
            </li>
          )}
          <li className="flex justify-between border-t-2 border-ink px-1 py-3.5 text-xl font-bold">
            <span>{t("I alt")}</span>
            <span className="tabular-nums">{kr(total)}</span>
          </li>
        </ul>
      </section>

      {delivery && (
        <fieldset className="min-w-0">
          <legend className={label}>{t("Henter du, eller skal vi køre ud med det?")}</legend>
          <div className={`grid gap-2 ${modes.length === 3 && !modes.includes("camp") ? "grid-cols-3" : "grid-cols-2"}`}>
            {modes.map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={choice(mode === m)}>
                {t(m === "pickup" ? "Jeg henter" : m === "door" ? "Bring det ud" : m === "boat" ? "Til båden" : "Til campingpladsen")}
                {m !== "pickup" && <span className="block font-normal">({delivery.fee ? kr(delivery.fee) : t("gratis")})</span>}
              </button>
            ))}
          </div>
          {mode === "boat" && (
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSpot("jetty")} aria-pressed={spot === "jetty"} className={choice(spot === "jetty")}>{t("Ned på broen")}</button>
                <button type="button" onClick={() => setSpot("office")} aria-pressed={spot === "office"} className={choice(spot === "office")}>{t("Ved havnekontoret")}</button>
              </div>
              {spot === "jetty" ? (
                <div className="grid grid-cols-[6rem_1fr] gap-3">
                  <div>
                    <label htmlFor="jetty" className={label}>{t("Bro")}</label>
                    <input id="jetty" required inputMode="numeric" value={jetty} onChange={(e) => setJetty(e.target.value)} placeholder={t("Fx 3")} className={field} />
                  </div>
                  <div>
                    <label htmlFor="boat" className={label}>{t("Bådens navn")}</label>
                    <input id="boat" required value={boat} onChange={(e) => setBoat(e.target.value)} placeholder={t("Fx Frida")} className={field} />
                  </div>
                </div>
              ) : (
                <p className="text-lg">{t("{navn} stiller maden ved havnekontoret, og du henter den der.", { navn: place.name })}</p>
              )}
              {missing > 0 && (
                <p className="bg-stamp-soft px-4 py-3 text-lg text-stamp">
                  {t("Levering kræver, at du bestiller for mindst {min}. Du mangler {mangler}.", { min: kr(delivery.minimum), mangler: kr(missing) })}
                </p>
              )}
            </div>
          )}
          {mode === "camp" && (
            <div className="mt-5 space-y-5">
              <p className="text-lg">{t("{navn} kommer ud til gæsterne på {camp}.", { navn: place.name, camp: CAMPSITE })}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setCampSpot("pitch")} aria-pressed={campSpot === "pitch"} className={choice(campSpot === "pitch")}>{t("Til min plads")}</button>
                <button type="button" onClick={() => setCampSpot("reception")} aria-pressed={campSpot === "reception"} className={choice(campSpot === "reception")}>{t("Ved receptionen")}</button>
              </div>
              {campSpot === "pitch" ? (
                <div>
                  <label htmlFor="pitch" className={label}>{t("Pladsnummer")}</label>
                  <input id="pitch" required value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder={t("Fx 112")} className={field} />
                  <p className="mt-1 text-ink-soft">{t("Står på skiltet ved jeres plads eller hytte.")}</p>
                </div>
              ) : (
                <p className="text-lg">{t("{navn} stiller maden i receptionen, og du henter den der.", { navn: place.name })}</p>
              )}
              {missing > 0 && (
                <p className="bg-stamp-soft px-4 py-3 text-lg text-stamp">
                  {t("Levering kræver, at du bestiller for mindst {min}. Du mangler {mangler}.", { min: kr(delivery.minimum), mangler: kr(missing) })}
                </p>
              )}
            </div>
          )}
          {mode === "door" && (
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="address" className={label}>{t("Din adresse")}</label>
                <input id="address" required autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("Fx Østergade 12, 1. th.")} className={field} />
              </div>
              <div>
                <label htmlFor="postcode" className={label}>{t("By")}</label>
                <select id="postcode" required value={zip} onChange={(e) => setPostcode(e.target.value)} className={field}>
                  {!zip && <option value="">{t("Vælg by")}</option>}
                  {delivery.postcodes.map((p) => (
                    <option key={p} value={p}>{townName(p)}</option>
                  ))}
                </select>
                <p className="mt-1 text-ink-soft">{t("{navn} kører kun ud til de byer, der står her.", { navn: place.name })}</p>
              </div>
              {missing > 0 && (
                <p className="bg-stamp-soft px-4 py-3 text-lg text-stamp">
                  {t("Levering kræver, at du bestiller for mindst {min}. Du mangler {mangler}.", { min: kr(delivery.minimum), mangler: kr(missing) })}
                </p>
              )}
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="min-w-0">
        <legend className={label}>{t(delivering ? "Hvornår vil du have maden?" : "Hvornår vil du hente?")}</legend>
        {options && options.asapMinutes === null && options.slots.length === 0 ? (
          <p className="bg-stamp-soft px-4 py-3 text-lg text-stamp">{t("{navn} tager ikke imod flere bestillinger i dag.", { navn: place.name })}</p>
        ) : (
          <>
            {options?.asapMinutes != null && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPickup("asap")} aria-pressed={chosen === "asap"} className={choice(chosen === "asap")}>
                  {t("Hurtigst muligt")} <span className="block font-normal">{t("ca. {min} min", { min: options.asapMinutes + (delivering ? 15 : 0) })}</span>
                </button>
                <button type="button" onClick={() => setPickup(chosen && chosen !== "asap" ? chosen : later[0])} aria-pressed={chosen !== "asap"} disabled={!later.length} className={`${choice(chosen !== "asap")} disabled:opacity-40`}>
                  {t("Senere i dag")} <span className="block font-normal">{chosen && chosen !== "asap" ? t("kl. {tid}", { tid: chosen }) : t("vælg et tidspunkt")}</span>
                </button>
              </div>
            )}
            {options?.asapMinutes == null && (
              <p className="mb-3 text-lg">{t("{navn} har lukket lige nu, men du kan bestille allerede nu til senere i dag.", { navn: place.name })}</p>
            )}
            {chosen !== "asap" && (
              <div className={options?.asapMinutes != null ? "mt-4 space-y-2" : "space-y-2"}>
                {slotsByHour(later).map((g) => (
                  <div key={g.hour} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-lg text-ink-soft tabular-nums">{t("kl. {tid}", { tid: g.hour })}</span>
                    <div className="grid flex-1 grid-cols-4 gap-2">
                      {g.slots.map((slot) => (
                        <button type="button" key={slot} onClick={() => setPickup(slot)} aria-pressed={chosen === slot} className={`${choice(chosen === slot).replace("px-4", "px-1")} tabular-nums`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </fieldset>

      <div className="space-y-5">
        <div>
          <label htmlFor="name" className={label}>{t("Dit navn")}</label>
          <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>{t("Dit telefonnummer")}</label>
          <input id="phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          <p className="mt-1 text-ink-soft">{t("Så restauranten kan ringe, hvis der er noget med din bestilling.")}</p>
        </div>
        <div>
          <label htmlFor="note" className={label}>{t("Besked til køkkenet")} <span className="font-normal text-ink-soft">{t("(hvis du vil)")}</span></label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Fx uden løg")} className={field} />
        </div>
      </div>

      {canPayOnline && (
        <fieldset className="min-w-0">
          <legend className={label}>{t("Hvordan vil du betale?")}</legend>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPay("online")} aria-pressed={pay === "online"} className={choice(pay === "online")}>
              {t("Betal nu")} <span className="block font-normal">{t("MobilePay eller kort")}</span>
            </button>
            <button type="button" onClick={() => setPay("later")} aria-pressed={pay === "later"} className={choice(pay === "later")}>
              {t(delivering ? "Betal ved døren" : "Betal ved afhentning")}
            </button>
          </div>
        </fieldset>
      )}

      <p className="border-2 border-ink bg-surface px-5 py-4 text-lg">
        {online ? (
          <><strong>{t("Du betaler nu med MobilePay eller kort.")}</strong> {t("Pengene trækkes først, når {navn} har sagt ja til bestillingen.", { navn: place.name })}</>
        ) : delivering ? (
          <><strong>{t("Du betaler, når maden kommer")}</strong> {t("til {adresse}.", { adresse: mode === "boat" ? boatPlace : mode === "camp" ? campPlace : address.trim() || t("din adresse") })}</>
        ) : (
          <><strong>{t("Du betaler, når du henter maden")}</strong> {t("hos {navn}, {adresse}.", { navn: place.name, adresse: place.address.replace(/, \d{4} .*/, "") })}</>
        )}
      </p>

      {error && <p role="alert" className="bg-stamp-soft px-4 py-3 text-lg text-stamp">{error}</p>}

      <button disabled={sending || !chosen || missing > 0} className="w-full bg-stamp px-5 py-4.5 text-xl font-bold text-white disabled:opacity-50">
        {sending ? t(online ? "Et øjeblik…" : "Sender…") : t(online ? "Gå til betaling · {pris}" : "Send bestilling · {pris}", { pris: kr(total) })}
      </button>
      <p className="text-center text-ink-soft">
        {t("Når du bestiller, accepterer du")} <Link href="/handelsbetingelser" className="underline">{t("handelsbetingelserne")}</Link>.{" "}
        {t("Sådan passer vi på dine oplysninger:")} <Link href="/privatliv" className="underline">{t("privatlivspolitikken")}</Link>.
      </p>
    </form>
  );
}

const choice = (on: boolean) =>
  `border-2 border-ink px-4 py-2.5 text-lg ${on ? "bg-ink font-bold text-paper" : "bg-transparent"}`;
