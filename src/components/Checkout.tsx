"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import { pickupOptions } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { useCart } from "./useCart";
import { useNow } from "./useNow";

const CUSTOMER_KEY = "assensnu:kunde";

export const field = "w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-lg outline-none focus:border-ink";
export const label = "mb-1.5 block text-lg font-bold";

export function Checkout({ place }: { place: Place }) {
  const router = useRouter();
  const now = useNow();
  const { cart, change, clear } = useCart(place.slug);
  const [pickup, setPickup] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Husk navn og telefon fra sidst, så man ikke skal skrive det igen
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
      setName(saved.name ?? "");
      setPhone(saved.phone ?? "");
    } catch {}
  }, []);

  const lines = place.menu.flatMap((c) => c.items).filter((i) => cart[i.id]);
  const total = lines.reduce((sum, i) => sum + i.price * cart[i.id], 0);
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
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(data?.error ?? "Bestillingen blev ikke sendt. Tjek din forbindelse og prøv igen.");
      setSending(false);
      return;
    }
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone }));
    } catch {}
    clear();
    router.push(`/ordre/${data.id}`);
  }

  if (lines.length === 0) {
    return (
      <div className="mt-6 rounded-[1.4rem] bg-surface shadow-card px-5 py-8 text-center text-lg">
        <p>Kurven er tom.</p>
        <Link href={`/sted/${place.slug}`} className="mt-3 inline-block font-bold text-sea underline">
          Se menuen hos {place.name}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="mt-6 space-y-8">
      <section>
        <ul className="overflow-hidden rounded-[1.4rem] bg-surface shadow-card">
          {lines.map((i) => (
            <li key={i.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
              <div className="flex shrink-0 items-center gap-1 rounded-full border-2 border-line">
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
          <li className="flex justify-between bg-paper/60 px-5 py-3.5 text-xl font-bold">
            <span>I alt</span>
            <span className="tabular-nums">{kr(total)}</span>
          </li>
        </ul>
      </section>

      <fieldset className="min-w-0">
        <legend className={label}>Hvornår vil du hente?</legend>
        {options && options.asapMinutes === null && options.slots.length === 0 ? (
          <p className="rounded-2xl bg-signal-soft px-4 py-3 text-lg text-signal">{place.name} tager ikke imod flere bestillinger i dag.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {options?.asapMinutes != null && (
              <button type="button" onClick={() => setPickup("asap")} aria-pressed={chosen === "asap"} className={choice(chosen === "asap")}>
                Hurtigst muligt <span className="font-normal">(ca. {options.asapMinutes} min)</span>
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

      <p className="rounded-2xl bg-surface px-5 py-4 text-lg">
        <strong>Du betaler, når du henter maden</strong> hos {place.name}, {place.address.replace(/, \d{4} .*/, "")}.
      </p>

      {error && <p role="alert" className="rounded-2xl bg-signal-soft px-4 py-3 text-lg text-signal">{error}</p>}

      <button disabled={sending || !chosen} className="w-full rounded-2xl bg-buoy px-5 py-4.5 text-xl font-bold text-ink disabled:opacity-50">
        {sending ? "Sender…" : `Send bestilling · ${kr(total)}`}
      </button>
    </form>
  );
}

const choice = (on: boolean) =>
  `rounded-full border-2 px-4 py-2.5 text-lg ${on ? "border-ink bg-ink font-bold text-white" : "border-line bg-surface"}`;
