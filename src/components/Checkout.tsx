"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import { pickupOptions } from "@/lib/hours";
import { townName } from "@/lib/postcodes";
import type { Place } from "@/lib/types";
import { useCart } from "./useCart";
import { useNow } from "./useNow";

const CUSTOMER_KEY = "assensnu:kunde";

export const field = "w-full border-2 border-ink bg-surface px-4 py-3.5 text-lg outline-none focus:border-stamp";
export const label = "mb-1.5 block text-lg font-bold";

export function Checkout({ place }: { place: Place }) {
  const router = useRouter();
  const now = useNow();
  const { cart, change, clear } = useCart(place.slug);
  const [pickup, setPickup] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Husk navn og telefon fra sidst, så man ikke skal skrive det igen
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
      setName(saved.name ?? "");
      setPhone(saved.phone ?? "");
      setAddress(saved.address ?? "");
      setPostcode(saved.postcode ?? "");
    } catch {}
  }, []);

  const lines = place.menu.flatMap((c) => c.items).filter((i) => cart[i.id]);
  const food = lines.reduce((sum, i) => sum + i.price * cart[i.id], 0);
  const delivery = place.delivery ?? null;
  const fee = delivering && delivery ? delivery.fee : 0;
  const total = food + fee;
  const missing = delivering && delivery ? delivery.minimum - food : 0;
  const zip = delivery?.postcodes.includes(postcode) ? postcode : delivery?.postcodes.length === 1 ? delivery.postcodes[0] : "";
  const options = now ? pickupOptions(place, now) : null;
  const chosen = pickup ?? (options?.asapMinutes != null ? "asap" : options?.slots[0] ?? null);

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
        items: lines.map((i) => ({ itemId: i.id, quantity: cart[i.id] })),
        name,
        phone,
        pickup: chosen,
        note,
        delivery: delivering ? { address, postcode: zip } : null,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(data?.error ?? "Bestillingen blev ikke sendt. Tjek din forbindelse og prøv igen.");
      setSending(false);
      return;
    }
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone, address, postcode: zip || postcode }));
    } catch {}
    clear();
    router.push(`/ordre/${data.id}`);
  }

  if (lines.length === 0) {
    return (
      <div className="mt-6 border-y-[3px] border-double border-ink px-5 py-8 text-center text-lg">
        <p>Kurven er tom.</p>
        <Link href={`/sted/${place.slug}`} className="mt-3 inline-block font-bold text-ink underline decoration-stamp decoration-2 underline-offset-4">
          Se menuen hos {place.name}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="mt-6 space-y-8">
      <section>
        <ul className="border-t-[3px] border-double border-ink">
          {lines.map((i) => (
            <li key={i.id} className="flex items-center gap-3 border-b border-line px-1 py-3">
              <div className="flex shrink-0 items-center gap-1 rounded-full border-2 border-ink">
                <button type="button" onClick={() => change(i.id, -1)} aria-label={`Fjern en ${i.name}`} className="h-10 w-10 text-xl">
                  −
                </button>
                <span className="w-5 text-center font-bold">{cart[i.id]}</span>
                <button type="button" onClick={() => change(i.id, 1)} aria-label={`Tilføj en ${i.name}`} className="h-10 w-10 text-xl">
                  +
                </button>
              </div>
              <span className="flex-1 text-lg">{i.name}</span>
              <span className="text-lg tabular-nums">{kr(i.price * cart[i.id])}</span>
            </li>
          ))}
          {fee > 0 && (
            <li className="flex justify-between border-b border-line px-1 py-3 text-lg">
              <span>Levering</span>
              <span className="tabular-nums">{kr(fee)}</span>
            </li>
          )}
          <li className="flex justify-between border-t-2 border-ink px-1 py-3.5 text-xl font-bold">
            <span>I alt</span>
            <span className="tabular-nums">{kr(total)}</span>
          </li>
        </ul>
      </section>

      {delivery && (
        <fieldset className="min-w-0">
          <legend className={label}>Henter du, eller skal vi køre ud med det?</legend>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDelivering(false)} aria-pressed={!delivering} className={choice(!delivering)}>
              Jeg henter
            </button>
            <button type="button" onClick={() => setDelivering(true)} aria-pressed={delivering} className={choice(delivering)}>
              Bring det ud <span className="font-normal">({delivery.fee ? kr(delivery.fee) : "gratis"})</span>
            </button>
          </div>
          {delivering && (
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="address" className={label}>Din adresse</label>
                <input id="address" required autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Fx Østergade 12, 1. th." className={field} />
              </div>
              <div>
                <label htmlFor="postcode" className={label}>By</label>
                <select id="postcode" required value={zip} onChange={(e) => setPostcode(e.target.value)} className={field}>
                  {!zip && <option value="">Vælg by</option>}
                  {delivery.postcodes.map((p) => (
                    <option key={p} value={p}>{townName(p)}</option>
                  ))}
                </select>
                <p className="mt-1 text-ink-soft">{place.name} kører kun ud til de byer, der står her.</p>
              </div>
              {missing > 0 && (
                <p className="bg-stamp-soft px-4 py-3 text-lg text-stamp">
                  Levering kræver, at du bestiller for mindst {kr(delivery.minimum)}. Du mangler {kr(missing)}.
                </p>
              )}
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="min-w-0">
        <legend className={label}>{delivering ? "Hvornår vil du have maden?" : "Hvornår vil du hente?"}</legend>
        {options && options.asapMinutes === null && options.slots.length === 0 ? (
          <p className="bg-stamp-soft px-4 py-3 text-lg text-stamp">{place.name} tager ikke imod flere bestillinger i dag.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {options?.asapMinutes != null && (
              <button type="button" onClick={() => setPickup("asap")} aria-pressed={chosen === "asap"} className={choice(chosen === "asap")}>
                Hurtigst muligt <span className="font-normal">(ca. {options.asapMinutes + (delivering ? 15 : 0)} min)</span>
              </button>
            )}
            {options?.slots.slice(0, 12).map((t) => (
              <button type="button" key={t} onClick={() => setPickup(t)} aria-pressed={chosen === t} className={choice(chosen === t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <div className="space-y-5">
        <div>
          <label htmlFor="name" className={label}>Dit navn</label>
          <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Dit telefonnummer</label>
          <input id="phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          <p className="mt-1 text-ink-soft">Så restauranten kan ringe, hvis der er noget med din bestilling.</p>
        </div>
        <div>
          <label htmlFor="note" className={label}>Besked til køkkenet <span className="font-normal text-ink-soft">(hvis du vil)</span></label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fx uden løg" className={field} />
        </div>
      </div>

      <p className="border-2 border-ink bg-surface px-5 py-4 text-lg">
        {delivering ? (
          <><strong>Du betaler, når maden kommer</strong> til {address.trim() || "din adresse"}.</>
        ) : (
          <><strong>Du betaler, når du henter maden</strong> hos {place.name}, {place.address.replace(/, \d{4} .*/, "")}.</>
        )}
      </p>

      {error && <p role="alert" className="bg-stamp-soft px-4 py-3 text-lg text-stamp">{error}</p>}

      <button disabled={sending || !chosen || missing > 0} className="w-full bg-stamp px-5 py-4.5 text-xl font-bold text-white disabled:opacity-50">
        {sending ? "Sender…" : `Send bestilling · ${kr(total)}`}
      </button>
    </form>
  );
}

const choice = (on: boolean) =>
  `border-2 border-ink px-4 py-2.5 text-lg ${on ? "bg-ink font-bold text-paper" : "bg-transparent"}`;
