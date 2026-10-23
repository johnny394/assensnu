"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/panel/DetailsEditors";
import { EVENT_TEXT_MAX, type AssensEvent } from "@/lib/events";
import { longDate } from "@/lib/format";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return res?.ok ? { ok: true } : { ok: false, error: data?.error ?? "Ingen forbindelse. Prøv igen." };
}

type Form = { title: string; date: string; time: string; venue: string; text: string; link: string };
const empty: Form = { title: "", date: "", time: "20:00", venue: "", text: "", link: "" };

// Koncerter, markeder og festivaler. Vises under Events, med steder man kan spise før.
// I admin lægger Johnny dem ud. I panelet lægger et sted sine egne ud (api="/api/panel/events").
type Where = { api?: string; venue?: string; onSaved?: () => void };
export function AdminEvents({ events, api = "/api/admin/events", venue, onSaved }: { events: AssensEvent[] } & Where) {
  const [open, setOpen] = useState<AssensEvent | "new" | null>(null);
  const inPanel = api !== "/api/admin/events";
  return (
    <section className={inPanel ? "rounded-3xl bg-surface px-5 py-4" : "mt-10"}>
      {inPanel ? <p className="text-lg font-bold">Jeres events</p> : <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight">Events</h2>}
      <p className="text-lg text-ink-soft">Kunderne ser dem under Events, med steder de kan spise før.</p>
      <button onClick={() => setOpen("new")} className="mt-4 min-h-14 w-full rounded-2xl border-2 border-ink px-5 text-xl font-bold">
        + Nyt event
      </button>
      {events.length > 0 && (
        <ul className="mt-4 space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <button onClick={() => setOpen(e)} className="w-full rounded-2xl border-2 border-ink bg-surface px-4 py-3 text-left">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-bold">{e.title}</span>
                  <span className="shrink-0 text-ink-soft">Ret ›</span>
                </span>
                <span className="block text-ink-soft first-letter:uppercase">
                  {longDate(e.date)} kl. {e.time} · {e.venue}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <EventSheet event={open === "new" ? null : open} api={api} venue={venue} onSaved={onSaved} onClose={() => setOpen(null)} />}
    </section>
  );
}

function EventSheet({ event, api, venue, onSaved, onClose }: { event: AssensEvent | null; onClose: () => void } & Where) {
  const router = useRouter();
  const done = onSaved ?? (() => router.refresh());
  const [form, setForm] = useState<Form>(event ? { ...empty, ...event, text: event.text ?? "", link: event.link ?? "" } : { ...empty, venue: venue ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = "w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg";
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    setError(null);
    const res = await post(api!, { ...form, id: event?.id });
    setSaving(false);
    if (!res.ok) return setError(res.error!);
    done();
    onClose();
  }
  async function remove() {
    if (!event || !confirm(`Skal "${event.title}" slettes?`)) return;
    const res = await post(`${api}/${event.id}/delete`, {});
    if (!res.ok) return setError(res.error!);
    done();
    onClose();
  }

  return (
    <Sheet title={event ? "Ret event" : "Nyt event"} onClose={onClose} onSave={save} saving={saving} error={error}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-lg font-bold">Hvad er det?</span>
          <input value={form.title} onChange={set("title")} placeholder="Fx Koncert med Lis Sørensen" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-lg font-bold">Dag</span>
            <input type="date" value={form.date} onChange={set("date")} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-lg font-bold">Starter kl.</span>
            <input type="time" value={form.time} onChange={set("time")} className={field} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-lg font-bold">Hvor?</span>
          <input value={form.venue} onChange={set("venue")} placeholder="Fx Tobaksgaarden" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-lg font-bold">Et par linjer <span className="font-normal text-ink-soft">(hvis du vil)</span></span>
          <textarea value={form.text} onChange={set("text")} maxLength={EVENT_TEXT_MAX} rows={3} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-lg font-bold">Link til billetter <span className="font-normal text-ink-soft">(hvis du vil)</span></span>
          <input type="url" inputMode="url" value={form.link} onChange={set("link")} placeholder="https://" className={field} />
        </label>
        {event && <ForOrganizer event={event} />}
        {event && (
          <button onClick={remove} className="w-full py-3 text-lg text-signal underline">
            Slet event
          </button>
        )}
      </div>
    </Sheet>
  );
}

// Arrangøren kan sætte linket i billetmailen eller på plakaten, så gæsterne selv finder et sted at spise før
function ForOrganizer({ event }: { event: AssensEvent }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window === "undefined" ? "" : window.location.origin}/events/${event.id}`;
  const text = `Skal I spise før ${event.title}? Se hvor der er bord eller takeaway klar i god tid: ${url}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {}
  }
  return (
    <div className="rounded-2xl bg-buoy-soft p-4">
      <p className="text-lg font-bold">Til arrangøren</p>
      <p className="mt-1 text-lg">Send teksten til {event.venue || "arrangøren"}, så de kan sætte den i billetmailen.</p>
      <p className="mt-2 break-words rounded-xl bg-surface px-3 py-2">{text}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="min-h-12 rounded-2xl bg-ink px-3 text-lg font-bold text-paper">
          {copied ? "Kopieret" : "Kopiér teksten"}
        </button>
        <a href={`/skilt?event=${event.id}`} target="_blank" className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-ink px-3 text-lg font-bold">
          Plakat med QR
        </a>
      </div>
    </div>
  );
}
