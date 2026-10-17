"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PanelLogin({ places }: { places: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState(places[0]?.slug ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function login(code: string) {
    setError(null);
    const res = await fetch("/api/panel/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, pin: code }),
    }).catch(() => null);
    if (res?.ok) router.refresh();
    else {
      setError((await res?.json().catch(() => null))?.error ?? "Ingen forbindelse. Prøv igen.");
      setPin("");
    }
  }

  const press = (digit: string) => {
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) login(next);
  };

  return (
    <div className="mx-auto max-w-sm">
      <label htmlFor="place" className="mb-1.5 block text-lg font-bold">Dit spisested</label>
      <select id="place" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-lg">
        {places.map((p) => (
          <option key={p.slug} value={p.slug}>{p.name}</option>
        ))}
      </select>

      <p className="mt-6 text-lg font-bold">Skriv jeres kode</p>
      <div className="mt-2 flex justify-center gap-3" aria-live="polite" aria-label={`${pin.length} af 4 cifre`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-5 w-5 rounded-full border-2 border-ink ${i < pin.length ? "bg-ink" : ""}`} />
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-center text-lg text-signal">{error}</p>}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} className="h-16 rounded-2xl bg-surface font-display text-2xl font-extrabold active:bg-buoy">
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press("0")} className="h-16 rounded-2xl bg-surface font-display text-2xl font-extrabold active:bg-buoy">0</button>
        <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Slet" className="h-16 rounded-2xl text-lg text-ink-soft">Slet</button>
      </div>
    </div>
  );
}
