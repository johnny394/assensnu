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
export function AdminEvents({ events }: { events: AssensEvent[] }) {
  const [open, setOpen] = useState<AssensEvent | "new" | null>(null);
  return (
    <section className="mt-10">
      <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight">Events</h2>
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
      {open && <EventSheet event={open === "new" ? null : open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function EventSheet({ event, onClose }: { event: AssensEvent | null; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(event ? { ...empty, ...event, text: event.text ?? "", link: event.link ?? "" } : empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = "w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg";
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    setError(null);
    const res = await post("/api/admin/events", { ...form, id: event?.id });
    setSaving(false);
    if (!res.ok) return setError(res.error!);
    router.refresh();
    onClose();
  }
  async function remove() {
    if (!event || !confirm(`Skal "${event.title}" slettes?`)) return;
    const res = await post(`/api/admin/events/${event.id}/delete`, {});
    if (!res.ok) return setError(res.error!);
    router.refresh();
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
        {event && (
          <button onClick={remove} className="w-full py-3 text-lg text-signal underline">
            Slet event
          </button>
        )}
      </div>
    </Sheet>
  );
}
