"use client";

import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import { lastChancePrice } from "@/lib/last-chance";
import { clockTime, NEWS_MAX, WAIT_STEPS } from "@/lib/live";
import type { Place } from "@/lib/types";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return res;
}

// Øverst i panelet: ét tryk, når køkkenet har travlt. Kunderne ser ventetiden med det samme.
export function WaitBar({ place, onChange }: { place: Place; onChange: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const extra = chosen ?? place.extraWaitMinutes;
  useEffect(() => {
    if (chosen === place.extraWaitMinutes) setChosen(null);
  }, [chosen, place.extraWaitMinutes]);

  const choose = async (m: number) => {
    setChosen(m);
    const res = await post("/api/panel/settings", { extraWaitMinutes: m });
    if (!res?.ok) {
      setChosen(null);
      alert("Det gik ikke igennem. Prøv igen.");
    }
    onChange();
  };

  return (
    <section className="rounded-3xl bg-surface px-4 py-4 sm:px-5 lg:col-span-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-lg font-bold">Hvor travlt har I lige nu?</p>
        <p className="text-ink-soft">
          {extra && place.busyUntil && chosen === null ? `Går selv tilbage til normal kl. ${place.busyUntil}` : "Kunderne ser ventetiden med det samme"}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {WAIT_STEPS.map((step) => (
          <button
            key={step.extra}
            onClick={() => choose(step.extra)}
            aria-pressed={extra === step.extra}
            className={`min-h-16 rounded-2xl px-1 py-2 leading-tight ${extra === step.extra ? (step.extra ? "bg-signal text-white" : "bg-ink text-white") : "border-2 border-line"}`}
          >
            <span className="block text-base font-bold sm:text-lg">{step.label}</span>
            <span className="block tabular-nums">{place.prepMinutes + step.extra} min</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// Dagens tilbud: står på stedets side i dag, og følgerne får en besked på telefonen
export function NewsBox({ place, followers, onChange }: { place: Place; followers: number | null; onChange: () => void }) {
  const [text, setText] = useState(place.news?.text ?? "");
  const [price, setPrice] = useState(place.news?.price ? String(place.news.price) : "");
  const [wasPrice, setWasPrice] = useState(place.news?.wasPrice ? String(place.news.wasPrice) : "");
  const [editing, setEditing] = useState(!place.news);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!place.news) setEditing(true);
  }, [place.news]);

  const send = async () => {
    setBusy(true);
    setError(null);
    const res = await post("/api/panel/news", { text, price: price.trim(), wasPrice: price.trim() ? wasPrice.trim() : "" });
    setBusy(false);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Det gik ikke igennem. Prøv igen.");
      return;
    }
    setEditing(false);
    onChange();
  };

  const who = followers === null ? null : followers === 0 ? "Ingen følger jer endnu" : followers === 1 ? "1 kunde følger jer" : `${followers} kunder følger jer`;
  const sendLabel = place.news ? "Gem rettelsen" : followers ? `Send til ${followers} ${followers === 1 ? "følger" : "følgere"}` : "Læg det ud";

  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Dagens tilbud</p>
      <p className="text-ink-soft">{who ? `${who} på AssensNu.` : "Kunderne kan følge jer på AssensNu."} De får en besked på telefonen.</p>

      {place.news && !editing ? (
        <>
          <p className="mt-3 rounded-2xl border-2 border-ink px-4 py-3 text-lg">
            {place.news.text}
            {place.news.price && (
              <strong className="block">
                {kr(place.news.price)}
                {place.news.wasPrice && <span className="font-normal"> (før {kr(place.news.wasPrice)})</span>} · kan bestilles
              </strong>
            )}
          </p>
          <p className="mt-2 font-bold text-go">Sendt kl. {clockTime(place.news.sentAt)}. Det står på jeres side resten af dagen.</p>
          <button onClick={() => setEditing(true)} className="mt-2 w-full py-2 text-lg underline">
            Ret teksten
          </button>
        </>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={NEWS_MAX}
            rows={3}
            placeholder="Fx Stegt flæsk med persillesovs"
            className="mt-3 w-full rounded-2xl border-2 border-line bg-paper px-4 py-3 text-lg"
          />
          <p className="text-right text-ink-soft tabular-nums">
            {text.length}/{NEWS_MAX}
          </p>
          <label className="mt-1 flex items-center gap-3 text-lg">
            <span className="flex-1">
              Tilbudspris i kr.
              <span className="block text-base text-ink-soft">Så kan kunderne bestille det. Lad stå tom for kun en besked.</span>
            </span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="109"
              aria-label="Tilbudspris i kroner"
              className="w-24 rounded-2xl border-2 border-line bg-paper px-3 py-3 text-right text-lg tabular-nums"
            />
          </label>
          {price && (
            <label className="mt-3 flex items-center gap-3 text-lg">
              <span className="flex-1">
                Normalpris i kr.
                <span className="block text-base text-ink-soft">Hvis du vil vise, hvor meget kunden sparer.</span>
              </span>
              <input
                value={wasPrice}
                onChange={(e) => setWasPrice(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="129"
                aria-label="Normalpris i kroner"
                className="w-24 rounded-2xl border-2 border-line bg-paper px-3 py-3 text-right text-lg tabular-nums"
              />
            </label>
          )}
          {place.news && <p className="mt-2 text-ink-soft">Følgerne har allerede fået dagens besked, så rettelsen kommer kun på jeres side.</p>}
          {error && <p className="mt-1 font-bold text-signal">{error}</p>}
          <button onClick={send} disabled={busy || !text.trim()} className="mt-3 min-h-14 w-full rounded-2xl bg-buoy px-4 text-lg font-bold disabled:opacity-50">
            {busy ? "Sender …" : sendLabel}
          </button>
          {place.news && (
            <button onClick={() => setEditing(false)} className="mt-1 w-full py-2 text-lg underline">
              Fortryd
            </button>
          )}
          {!place.news && <p className="mt-2 text-ink-soft">Én besked om dagen, så ingen bliver trætte af jer.</p>}
        </>
      )}
    </div>
  );
}

// Sidste chance: de retter, der er tilbage sidst på dagen, til halv pris indtil lukketid
export function LastChanceBox({ place, open, onChange }: { place: Place; open: boolean; onChange: () => void }) {
  const active = place.lastChance;
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>(active?.itemIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = place.menu.flatMap((c) => c.items).filter((i) => !i.soldOut);
  const names = new Map(items.map((i) => [i.id, i.name]));

  const send = async (itemIds: string[]) => {
    setBusy(true);
    setError(null);
    const res = await post("/api/panel/last-chance", { itemIds });
    setBusy(false);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Det gik ikke igennem. Prøv igen.");
      return;
    }
    setPicking(false);
    onChange();
  };
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className={`rounded-3xl px-5 py-4 ${active ? "border-4 border-stamp bg-stamp-soft" : "bg-surface"}`}>
      <p className="text-lg font-bold">Sidste chance · halv pris</p>
      {active && !picking ? (
        <>
          <p className="mt-1 text-lg">
            Halv pris til <strong>kl. {clockTime(active.until)}</strong> på:
          </p>
          <ul className="mt-1 text-lg">
            {active.itemIds.map((id) => (
              <li key={id}>· {names.get(id) ?? "En ret, der er slettet"}</li>
            ))}
          </ul>
          <p className="mt-2 text-ink-soft">Det slutter af sig selv, når I lukker.</p>
          {error && <p className="mt-1 font-bold text-signal">{error}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => { setChosen(active.itemIds); setPicking(true); }} className="min-h-14 rounded-2xl border-2 border-ink text-lg font-bold">
              Ret retterne
            </button>
            <button onClick={() => send([])} disabled={busy} className="min-h-14 rounded-2xl bg-ink text-lg font-bold text-white disabled:opacity-50">
              Stop nu
            </button>
          </div>
        </>
      ) : !picking ? (
        <>
          <p className="text-ink-soft">Har I mad tilbage før lukketid? Sæt det til halv pris, så det bliver spist i stedet for smidt ud. Jeres følgere kan få en besked, når I starter.</p>
          <button onClick={() => { setChosen([]); setPicking(true); }} disabled={!open || items.length === 0} className="mt-3 min-h-14 w-full rounded-2xl border-2 border-stamp text-lg font-bold text-stamp disabled:opacity-50">
            Vælg retter
          </button>
          {!open && <p className="mt-2 text-ink-soft">Kan slås til, mens I har åbent.</p>}
        </>
      ) : (
        <>
          <p className="text-ink-soft">Tryk på det, I har tilbage.</p>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {items.map((i) => (
              <button
                key={i.id}
                onClick={() => toggle(i.id)}
                aria-pressed={chosen.includes(i.id)}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-lg ${chosen.includes(i.id) ? "bg-stamp text-white" : "border-2 border-line"}`}
              >
                <span>{chosen.includes(i.id) ? "✓ " : ""}{i.name}</span>
                <span className="shrink-0 tabular-nums">
                  {chosen.includes(i.id) ? <><s className="opacity-70">{kr(i.price)}</s> {kr(lastChancePrice(i.price))}</> : kr(i.price)}
                </span>
              </button>
            ))}
          </div>
          {error && <p className="mt-2 font-bold text-signal">{error}</p>}
          <button onClick={() => send(chosen)} disabled={busy || chosen.length === 0} className="mt-3 min-h-14 w-full rounded-2xl bg-stamp px-4 text-lg font-bold text-white disabled:opacity-50">
            {busy ? "Gemmer …" : `Halv pris til lukketid · ${chosen.length} ${chosen.length === 1 ? "ret" : "retter"}`}
          </button>
          <button onClick={() => setPicking(false)} className="mt-1 w-full py-2 text-lg underline">
            Fortryd
          </button>
        </>
      )}
    </div>
  );
}
