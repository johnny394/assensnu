"use client";

import { useState } from "react";
import { CHEF_NAME_MAX, CHEF_TEXT_MAX, chefPhotoUrl } from "@/lib/chef";
import type { Place } from "@/lib/types";

// Billedet gøres mindre på telefonen, så det sendes hurtigt og ikke fylder
async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Mød kokken: et billede og et par linjer om dem, der laver maden
export function ChefBox({ place, onChange }: { place: Place; onChange: () => void }) {
  const chef = place.chef;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chef?.name ?? "");
  const [text, setText] = useState(chef?.text ?? "");
  const [photo, setPhoto] = useState<string | null | undefined>(undefined); // undefined = behold billedet
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownPhoto = photo === undefined ? (chef ? chefPhotoUrl(place.slug, chef) : null) : photo;

  const start = () => {
    setName(chef?.name ?? "");
    setText(chef?.text ?? "");
    setPhoto(undefined);
    setError(null);
    setEditing(true);
  };
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setPhoto(await shrinkPhoto(file));
    } catch {
      setError("Billedet kunne ikke læses. Prøv et andet billede.");
    }
  };
  const send = async (body: object) => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/panel/chef", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const b = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(b?.error ?? "Det gik ikke igennem. Prøv igen.");
      return;
    }
    setEditing(false);
    onChange();
  };

  if (!editing) {
    return (
      <div className="rounded-3xl bg-surface px-5 py-4">
        <p className="text-lg font-bold">Mød kokken</p>
        {chef ? (
          <>
            <div className="mt-2 flex gap-3">
              {shownPhoto && <img src={shownPhoto} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />}
              <div>
                <p className="text-lg font-bold">{chef.name}</p>
                <p className="whitespace-pre-line text-ink-soft">{chef.text}</p>
              </div>
            </div>
            {error && <p className="mt-2 font-bold text-signal">{error}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={start} className="min-h-14 rounded-2xl border-2 border-ink text-lg font-bold">
                Ret
              </button>
              <button
                onClick={() => confirm("Skal billedet og teksten fjernes fra jeres side?") && send({ name: "", text: "", photo: null })}
                disabled={busy}
                className="min-h-14 rounded-2xl border-2 border-line text-lg font-bold disabled:opacity-50"
              >
                Fjern
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-ink-soft">Vis kunderne, hvem der laver maden. Et billede og et par linjer om jer.</p>
            <button onClick={start} className="mt-3 min-h-14 w-full rounded-2xl border-2 border-ink text-lg font-bold">
              Fortæl om jer
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Mød kokken</p>
      <div className="mt-3 flex items-center gap-3">
        {shownPhoto ? (
          <img src={shownPhoto} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-line text-center text-ink-soft">
            Intet billede
          </div>
        )}
        <div className="flex-1 space-y-1">
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-ink text-lg font-bold">
            {shownPhoto ? "Skift billede" : "Vælg billede"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {shownPhoto && (
            <button onClick={() => setPhoto(null)} className="w-full py-1 text-lg underline">
              Uden billede
            </button>
          )}
        </div>
      </div>
      <label className="mt-4 block text-lg font-bold" htmlFor="chef-name">Hvem står bag?</label>
      <input
        id="chef-name"
        value={name}
        maxLength={CHEF_NAME_MAX}
        onChange={(e) => setName(e.target.value)}
        placeholder="Fx Ali og Sara"
        className="mt-1 min-h-14 w-full rounded-2xl border-2 border-line bg-white px-4 text-lg"
      />
      <label className="mt-3 block text-lg font-bold" htmlFor="chef-text">Et par linjer om jer</label>
      <textarea
        id="chef-text"
        value={text}
        maxLength={CHEF_TEXT_MAX}
        rows={4}
        onChange={(e) => setText(e.target.value)}
        placeholder="Fx Vi har bagt pizza i Assens siden 2009. Dejen hviler i to døgn, og tomaterne kommer fra Italien."
        className="mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg"
      />
      <p className="text-right text-ink-soft">{text.length} af {CHEF_TEXT_MAX} tegn</p>
      {error && <p className="mt-1 font-bold text-signal">{error}</p>}
      <button
        onClick={() => send({ name, text, ...(photo !== undefined ? { photo } : {}) })}
        disabled={busy}
        className="mt-2 min-h-14 w-full rounded-2xl bg-ink text-lg font-bold text-white disabled:opacity-50"
      >
        {busy ? "Gemmer …" : "Gem"}
      </button>
      <button onClick={() => setEditing(false)} className="mt-1 w-full py-2 text-lg underline">
        Fortryd
      </button>
    </div>
  );
}
