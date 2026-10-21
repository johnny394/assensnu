"use client";

import { useState } from "react";

// Skilte med QR-kode til campingpladsen, hotellet, havnen eller restaurantens disk
export function AdminSigns({ places }: { places: { slug: string; name: string }[] }) {
  const [where, setWhere] = useState("");
  const [place, setPlace] = useState("");
  const field = "w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg";
  const href = `/skilt?${new URLSearchParams({ ...(place && { sted: place }), ...(where.trim() && { navn: where.trim() }) })}`;
  return (
    <section className="mt-10">
      <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight">Skilte med QR-kode</h2>
      <p className="text-lg text-ink-soft">&quot;Sult? Scan her&quot; til receptionen. Turisterne får siden på deres eget sprog.</p>
      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-lg font-bold">Hvor skal skiltet hænge? <span className="font-normal text-ink-soft">(hvis du vil)</span></span>
          <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Fx Assens Camping" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-lg font-bold">Hvad skal de se, når de scanner?</span>
          <select value={place} onChange={(e) => setPlace(e.target.value)} className={field}>
            <option value="">Alle spisesteder i Assens</option>
            {places.map((p) => (
              <option key={p.slug} value={p.slug}>Kun {p.name}</option>
            ))}
          </select>
        </label>
        <a href={href} target="_blank" className="flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-ink px-5 text-xl font-bold">
          Vis skiltet
        </a>
      </div>
    </section>
  );
}
