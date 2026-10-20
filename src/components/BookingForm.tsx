"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { longDate } from "@/lib/format";
import { todayInCopenhagen } from "@/lib/hours";
import type { Place } from "@/lib/types";
import { field, label } from "./Checkout";
import { useLang } from "./useLang";

const CUSTOMER_KEY = "assensnu:kunde";

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Mandag = 0, som i resten af appen
const weekdayOf = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

function timesFor(place: Place, date: string): string[] {
  const periods = place.hours.filter((h) => h.day === weekdayOf(date));
  const times: string[] = [];
  for (const p of periods) {
    const [oh, om] = p.open.split(":").map(Number);
    const [ch, cm] = p.close.split(":").map(Number);
    const close = ch * 60 + cm <= oh * 60 + om ? 24 * 60 : ch * 60 + cm;
    // Sidste bord en time før lukketid
    for (let t = Math.ceil((oh * 60 + om) / 30) * 30; t <= close - 60; t += 30) {
      times.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    }
  }
  return times;
}

export function BookingForm({ place }: { place: Place }) {
  const router = useRouter();
  const [today, setToday] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { lang, t } = useLang();

  useEffect(() => {
    const day = todayInCopenhagen();
    setToday(day);
    setDate(day);
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
      setName(saved.name ?? "");
      setPhone(saved.phone ?? "");
    } catch {}
  }, []);

  const days = useMemo(() => (today ? Array.from({ length: 14 }, (_, i) => addDays(today, i)) : []), [today]);
  const times = date ? timesFor(place, date) : [];

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      setError(t("Vælg dag og tidspunkt."));
      return;
    }
    setSending(true);
    setError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: place.slug, date, time, guests, name, phone, note }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(t(data?.error ?? "Forespørgslen blev ikke sendt. Tjek din forbindelse og prøv igen."));
      setSending(false);
      return;
    }
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone }));
    } catch {}
    router.push(`/booking/${data.id}`);
  }

  const dayName = (d: string, i: number) => (i === 0 ? t("I dag") : i === 1 ? t("I morgen") : longDate(d, lang).split(/[ ,]/)[0]);

  return (
    <form onSubmit={send} className="mt-6 space-y-8">
      <fieldset className="min-w-0">
        <legend className={label}>{t("Hvor mange er I?")}</legend>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} aria-label={t("Én færre")} className="h-14 w-14 rounded-full border-2 border-ink text-2xl">
            −
          </button>
          <span className="w-24 text-center font-display text-3xl font-black" aria-live="polite">
            {guests} <span className="text-lg font-semibold">{t(guests === 1 ? "person" : "personer")}</span>
          </span>
          <button type="button" onClick={() => setGuests(Math.min(20, guests + 1))} aria-label={t("Én mere")} className="h-14 w-14 rounded-full border-2 border-ink text-2xl">
            +
          </button>
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className={label}>{t("Hvilken dag?")}</legend>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {days.map((d, i) => (
            <button
              type="button"
              key={d}
              onClick={() => {
                setDate(d);
                setTime(null);
              }}
              aria-pressed={date === d}
              className={`shrink-0 border-2 border-ink px-4 py-2.5 text-left ${date === d ? "bg-ink text-paper" : "bg-transparent"}`}
            >
              <span className="block text-lg font-bold first-letter:uppercase">{dayName(d, i)}</span>
              <span className="text-sm">{Number(d.slice(8))}/{Number(d.slice(5, 7))}</span>
            </button>
          ))}
        </div>
        {date && <p className="mt-2 text-ink-soft first-letter:uppercase">{longDate(date, lang)}</p>}
      </fieldset>

      <fieldset className="min-w-0">
        <legend className={label}>{t("Hvad tid?")}</legend>
        {times.length === 0 ? (
          <p className="border-2 border-dashed border-ink-soft/50 px-4 py-3 text-lg text-ink-soft">{t("Der er lukket den dag. Vælg en anden dag.")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {times.map((slot) => (
              <button
                type="button"
                key={slot}
                onClick={() => setTime(slot)}
                aria-pressed={time === slot}
                className={`border-2 border-ink px-4 py-2.5 text-lg tabular-nums ${time === slot ? "bg-ink font-bold text-paper" : "bg-transparent"}`}
              >
                {slot}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <div className="space-y-5">
        <div>
          <label htmlFor="bname" className={label}>{t("Dit navn")}</label>
          <input id="bname" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="bphone" className={label}>{t("Dit telefonnummer")}</label>
          <input id="bphone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="bnote" className={label}>{t("Noget restauranten skal vide?")} <span className="font-normal text-ink-soft">{t("(hvis du vil)")}</span></label>
          <input id="bnote" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Fx barnestol eller fødselsdag")} className={field} />
        </div>
      </div>

      <p className="border-2 border-ink bg-surface px-5 py-4 text-lg">
        {t("Det er en forespørgsel. {navn} svarer så hurtigt som muligt, og du kan følge svaret på næste side.", { navn: place.name })}
      </p>

      {error && <p role="alert" className="bg-stamp-soft px-4 py-3 text-lg text-stamp">{error}</p>}

      <button disabled={sending} className="w-full bg-stamp px-5 py-4.5 text-xl font-bold text-white disabled:opacity-50">
        {t(sending ? "Sender…" : "Send forespørgsel")}
      </button>
      <Link href={`/sted/${place.slug}`} className="block text-center text-lg text-ink-soft underline">
        {t("Fortryd")}
      </Link>
    </form>
  );
}
