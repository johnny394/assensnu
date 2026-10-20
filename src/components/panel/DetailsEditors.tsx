"use client";

import { useState } from "react";
import { WEEKDAYS } from "@/lib/hours";
import type { MenuCategory, OpeningPeriod, Place, Weekday } from "@/lib/types";

// Restauranten retter selv telefon, åbningstider og menukort. Hver del åbner som en
// hel side ovenpå panelet med en stor Gem-knap i bunden.

async function saveDetails(body: object, url = "/api/panel/details"): Promise<string | null> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (res?.ok) return null;
  return (await res?.json().catch(() => null))?.error ?? "Ingen forbindelse. Prøv igen.";
}

const field = "w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg outline-none focus:border-ink";
const small = "min-h-11 rounded-xl px-3 text-base";

export function Sheet({ title, onClose, onSave, saving, error, children }: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3">
          <h2 className="font-display text-2xl font-black tracking-tight">{title}</h2>
          <button onClick={onClose} className="py-2 text-lg underline">Luk</button>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-5 pb-40 pt-5">{children}</div>
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {error && <p role="alert" className="mb-2 rounded-2xl bg-signal-soft px-4 py-3 text-lg text-signal">{error}</p>}
          <button onClick={onSave} disabled={saving} className="min-h-14 w-full rounded-2xl bg-go px-5 text-xl font-bold text-white disabled:opacity-60">
            {saving ? "Gemmer…" : "Gem"}
          </button>
        </div>
      </div>
    </div>
  );
}

type Period = { open: string; close: string };

// Johnny bruger samme skærm i sit eget panel, men uden telefon (den retter han under Oplysninger)
export function HoursEditor({ place, onClose, onSaved, saveUrl, withPhone = true }: {
  place: Pick<Place, "phone" | "hours">;
  onClose: () => void;
  onSaved: () => void;
  saveUrl?: string;
  withPhone?: boolean;
}) {
  const [phone, setPhone] = useState(place.phone ?? "");
  const [days, setDays] = useState<Period[][]>(() => WEEKDAYS.map((_, d) => place.hours.filter((h) => h.day === d).map(({ open, close }) => ({ open, close }))));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDay = (d: number, periods: Period[]) => setDays((all) => all.map((p, i) => (i === d ? periods : p)));
  // Nye dage får tiderne fra den nærmeste dag før, der har åbent, så man ikke skal taste det samme igen
  const openDay = (d: number) => {
    const before = [...days.slice(0, d)].reverse().find((p) => p.length);
    setDay(d, before ? before.map((p) => ({ ...p })) : [{ open: "11:00", close: "21:00" }]);
  };

  async function save() {
    const hours: OpeningPeriod[] = days.flatMap((periods, day) => periods.map((p) => ({ day: day as Weekday, ...p })));
    setSaving(true);
    setError(null);
    const problem = await saveDetails(withPhone ? { phone, hours } : { hours }, saveUrl);
    setSaving(false);
    if (problem) setError(problem);
    else onSaved();
  }

  return (
    <Sheet title={withPhone ? "Telefon og åbningstider" : "Åbningstider"} onClose={onClose} onSave={save} saving={saving} error={error}>
      {withPhone && (
        <>
          <label htmlFor="phone" className="mb-1.5 block text-lg font-bold">Telefonnummer</label>
          <input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Fx 64 71 23 45" className={field} />
          <p className="mt-1 text-ink-soft">Det nummer, kunderne ringer til.</p>
        </>
      )}

      {withPhone && <h3 className="mt-8 text-lg font-bold">Åbningstider</h3>}
      <p className="text-ink-soft">Lukker I efter midnat, så skriv bare fx 02:00.</p>
      <ul className="mt-3 space-y-2">
        {WEEKDAYS.map((name, d) => (
          <li key={name} className="rounded-3xl bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold">{name}</span>
              {days[d].length === 0 ? (
                <button onClick={() => openDay(d)} className={`${small} border-2 border-ink font-bold`}>Lukket · tryk for at åbne</button>
              ) : (
                <button onClick={() => setDay(d, [])} className={`${small} text-ink-soft underline`}>Lukket hele dagen</button>
              )}
            </div>
            {days[d].map((p, i) => (
              <div key={i} className="mt-2 flex items-center gap-2">
                <input type="time" aria-label={`${name} åbner`} value={p.open} onChange={(e) => setDay(d, days[d].map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} className={`${field} min-w-0 tabular-nums`} />
                <span className="shrink-0 text-lg">til</span>
                <input type="time" aria-label={`${name} lukker`} value={p.close} onChange={(e) => setDay(d, days[d].map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} className={`${field} min-w-0 tabular-nums`} />
                {days[d].length > 1 && (
                  <button onClick={() => setDay(d, days[d].filter((_, j) => j !== i))} aria-label="Fjern denne tid" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl text-ink-soft">×</button>
                )}
              </div>
            ))}
            {days[d].length > 0 && days[d].length < 3 && (
              <button onClick={() => setDay(d, [...days[d], { open: "17:00", close: "21:00" }])} className="mt-2 py-1 text-ink-soft underline">
                + Lukket midt på dagen? Tilføj en tid mere
              </button>
            )}
          </li>
        ))}
      </ul>
      {days[0].length > 0 && (
        <button onClick={() => setDays((all) => all.map(() => all[0].map((p) => ({ ...p }))))} className="mt-3 min-h-12 w-full rounded-2xl border-2 border-ink text-lg font-bold">
          Brug mandagens tider alle dage
        </button>
      )}
    </Sheet>
  );
}

type DraftItem = { id: string; name: string; description: string; price: string };
type DraftCategory = { key: string; name: string; items: DraftItem[] };

const newItem = (): DraftItem => ({ id: crypto.randomUUID(), name: "", description: "", price: "" });
const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};

export function MenuEditor({ place, onClose, onSaved, saveUrl }: {
  place: Pick<Place, "menu">;
  onClose: () => void;
  onSaved: () => void;
  saveUrl?: string;
}) {
  const [categories, setCategories] = useState<DraftCategory[]>(() =>
    place.menu.length
      ? place.menu.map((c) => ({
          key: crypto.randomUUID(),
          name: c.name,
          items: c.items.map((i) => ({ id: i.id, name: i.name, description: i.description ?? "", price: String(i.price).replace(".", ",") })),
        }))
      : [{ key: crypto.randomUUID(), name: "", items: [newItem()] }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCategory = (ci: number, change: (c: DraftCategory) => DraftCategory) => setCategories((all) => all.map((c, i) => (i === ci ? change(c) : c)));
  const setItem = (ci: number, ii: number, change: Partial<DraftItem>) =>
    setCategory(ci, (c) => ({ ...c, items: c.items.map((item, j) => (j === ii ? { ...item, ...change } : item)) }));

  async function save() {
    // Tomme linjer springes over, så en ekstra "Tilføj ret" ikke giver en fejl
    const menu: MenuCategory[] = categories
      .map((c) => ({
        name: c.name,
        items: c.items
          .filter((i) => i.name.trim() || i.price.trim())
          .map((i) => ({ id: i.id, name: i.name, description: i.description, price: i.price.trim() ? Number(i.price.replace(/\s|kr\.?/g, "").replace(",", ".")) : NaN })),
      }))
      .filter((c) => c.name.trim() || c.items.length);
    setSaving(true);
    setError(null);
    const problem = await saveDetails({ menu }, saveUrl);
    setSaving(false);
    if (problem) setError(problem);
    else onSaved();
  }

  return (
    <Sheet title="Menukort" onClose={onClose} onSave={save} saving={saving} error={error}>
      <p className="text-lg text-ink-soft">Skriv retterne, som de står på jeres menukort. Kunderne ser ændringerne, så snart I trykker Gem.</p>
      <div className="mt-5 space-y-5">
        {categories.map((c, ci) => (
          <section key={c.key} className="rounded-3xl bg-surface p-4">
            <label className="block">
              <span className="mb-1 block font-bold">Kategori</span>
              <input value={c.name} onChange={(e) => setCategory(ci, (x) => ({ ...x, name: e.target.value }))} placeholder="Fx Pizza eller Drikkevarer" className={`${field} font-bold`} />
            </label>

            <ul className="mt-3 space-y-3">
              {c.items.map((item, ii) => (
                <li key={item.id} className="rounded-2xl border-2 border-line p-3">
                  <input aria-label="Rettens navn" value={item.name} onChange={(e) => setItem(ci, ii, { name: e.target.value })} placeholder="Navn, fx Margherita" className={field} />
                  <input aria-label="Beskrivelse" value={item.description} onChange={(e) => setItem(ci, ii, { description: e.target.value })} placeholder="Hvad er der i? (hvis I vil)" className={`${field} mt-2 text-base`} />
                  <div className="mt-2 flex items-center gap-1">
                    <label className="mr-1 flex w-32 shrink-0 items-center rounded-2xl border-2 border-line bg-surface pr-3 focus-within:border-ink">
                      <input aria-label={`Pris for ${item.name || "retten"}`} inputMode="decimal" value={item.price} onChange={(e) => setItem(ci, ii, { price: e.target.value })} placeholder="Pris" className="w-full min-w-0 bg-transparent px-3 py-3 text-right text-lg tabular-nums outline-none" />
                      <span className="text-ink-soft">kr.</span>
                    </label>
                    <button onClick={() => setCategory(ci, (x) => ({ ...x, items: move(x.items, ii, ii - 1) }))} disabled={ii === 0} aria-label="Flyt op" className={`${small} border-2 border-line disabled:opacity-30`}>↑</button>
                    <button onClick={() => setCategory(ci, (x) => ({ ...x, items: move(x.items, ii, ii + 1) }))} disabled={ii === c.items.length - 1} aria-label="Flyt ned" className={`${small} border-2 border-line disabled:opacity-30`}>↓</button>
                    <button
                      onClick={() => (!item.name || confirm(`Slet ${item.name}?`)) && setCategory(ci, (x) => ({ ...x, items: x.items.filter((_, j) => j !== ii) }))}
                      className={`${small} ml-auto whitespace-nowrap text-signal underline`}
                    >
                      Slet
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button onClick={() => setCategory(ci, (x) => ({ ...x, items: [...x.items, newItem()] }))} className="mt-3 min-h-12 w-full rounded-2xl border-2 border-ink text-lg font-bold">
              + Tilføj ret
            </button>
            <div className="mt-2 flex items-center gap-1 whitespace-nowrap">
              <button onClick={() => setCategories((all) => move(all, ci, ci - 1))} disabled={ci === 0} className={`${small} text-ink-soft underline disabled:opacity-30`}>↑ Op</button>
              <button onClick={() => setCategories((all) => move(all, ci, ci + 1))} disabled={ci === categories.length - 1} className={`${small} text-ink-soft underline disabled:opacity-30`}>↓ Ned</button>
              <button
                onClick={() => confirm(`Slet ${c.name || "kategorien"} og alle dens retter?`) && setCategories((all) => all.filter((_, i) => i !== ci))}
                className={`${small} ml-auto text-signal underline`}
              >
                Slet kategori
              </button>
            </div>
          </section>
        ))}
      </div>
      <button onClick={() => setCategories((all) => [...all, { key: crypto.randomUUID(), name: "", items: [newItem()] }])} className="mt-5 min-h-14 w-full rounded-2xl border-2 border-dashed border-ink text-lg font-bold">
        + Ny kategori
      </button>
    </Sheet>
  );
}
