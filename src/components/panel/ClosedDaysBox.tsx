"use client";

import { useState } from "react";
import { periodText, upcomingHolidays } from "@/lib/closed-days";
import { todayInCopenhagen } from "@/lib/hours";
import type { ClosedPeriod, Place } from "@/lib/types";

// Lukkedage på forhånd: juleaften med ét tryk, eller en hel ferie med fra og til
export function ClosedDaysBox({ place, onChange }: { place: Place; onChange: () => void }) {
  const [periods, setPeriods] = useState<ClosedPeriod[]>(place.closedDays ?? []);
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayInCopenhagen();
  const holidays = upcomingHolidays(today).filter((h) => !periods.some((p) => p.from <= h.from && h.from <= p.to));

  async function save(next: ClosedPeriod[]) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/panel/closed-days", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ periods: next }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error ?? "Ingen forbindelse. Prøv igen.");
      return false;
    }
    setPeriods(data.periods);
    onChange();
    return true;
  }

  async function addOwn() {
    if (!from) return setError("Vælg den første lukkedag.");
    if (await save([...periods, { from, to: to || from, note }])) {
      setAdding(false);
      setFrom("");
      setTo("");
      setNote("");
    }
  }

  const field = "w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg";
  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Lukkedage på forhånd</p>
      <p className="text-ink-soft">Kunderne ser, at I holder lukket, og kan ikke bestille eller booke de dage.</p>

      {periods.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {periods.map((p) => (
            <li key={`${p.from}-${p.to}`} className="flex items-center justify-between gap-3 py-2.5 text-lg">
              <span>
                <strong>{periodText(p)}</strong>
                {p.note && <span className="text-ink-soft"> · {p.note}</span>}
              </span>
              <button disabled={busy} onClick={() => save(periods.filter((x) => x !== p))} className="shrink-0 text-ink-soft underline">
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}

      {holidays.length > 0 && (
        <>
          <p className="mt-4 font-bold">Lukket på en helligdag? Tryk på den.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {holidays.map((h) => (
              <button key={h.from} disabled={busy} onClick={() => save([...periods, h])} className="min-h-12 rounded-full border-2 border-ink px-4 text-lg disabled:opacity-50">
                {h.note} <span className="text-ink-soft">{periodText(h)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {adding ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-lg font-bold">Lukket fra</span>
              <input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-lg font-bold">Til og med</span>
              <input type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className={field} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-lg font-bold">Hvorfor? <span className="font-normal text-ink-soft">(hvis du vil)</span></span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={40} placeholder="Fx Vinterferie" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAdding(false)} className="min-h-14 rounded-2xl border-2 border-line text-lg font-bold">Fortryd</button>
            <button disabled={busy} onClick={addOwn} className="min-h-14 rounded-2xl bg-go text-lg font-bold text-white disabled:opacity-50">Gem</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-4 min-h-14 w-full rounded-2xl border-2 border-ink px-5 text-lg font-bold">
          + Ferie eller andre dage
        </button>
      )}
      {error && <p role="alert" className="mt-2 font-bold text-signal">{error}</p>}
    </div>
  );
}
