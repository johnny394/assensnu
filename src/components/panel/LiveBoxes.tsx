"use client";

import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import { clockTime, NEWS_MAX, WAIT_STEPS } from "@/lib/live";
import { PUSH_KR } from "@/lib/plans";
import type { Place } from "@/lib/types";
import { SITE } from "@/lib/site";

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
// push: de gratis beskeder, der er tilbage i måneden, og om stedet har en pakke med kort, så en ekstra kan betales
export function NewsBox({ place, followers, push, onChange }: { place: Place; followers: number | null; push: { left: number; canPay: boolean }; onChange: () => void }) {
  const [text, setText] = useState(place.news?.text ?? "");
  const [price, setPrice] = useState(place.news?.price ? String(place.news.price) : "");
  const [wasPrice, setWasPrice] = useState(place.news?.wasPrice ? String(place.news.wasPrice) : "");
  const [editing, setEditing] = useState(!place.news);
  const [notify, setNotify] = useState(push.left > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!place.news) setEditing(true);
  }, [place.news]);

  const send = async () => {
    setBusy(true);
    setError(null);
    const res = await post("/api/panel/news", { text, price: price.trim(), wasPrice: price.trim() ? wasPrice.trim() : "", push: canNotify && notify });
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
  const canNotify = !place.news && !!followers && (push.left > 0 || push.canPay);
  const sendLabel = place.news ? "Gem rettelsen" : canNotify && notify ? `Send til ${followers} ${followers === 1 ? "følger" : "følgere"}` : "Læg det ud";
  const cost = push.left > 0 ? `Gratis. I har ${push.left} gratis ${push.left === 1 ? "besked" : "beskeder"} tilbage i denne måned.` : `Koster ${kr(PUSH_KR)} plus moms. Det kommer på næste regning.`;

  return (
    <div className="rounded-3xl bg-surface px-5 py-4">
      <p className="text-lg font-bold">Dagens tilbud</p>
      <p className="text-ink-soft">{who ? `${who} på ${SITE}.` : `Kunderne kan følge jer på ${SITE}.`} De får en besked på telefonen.</p>

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
          <p className="mt-2 font-bold text-go">Lagt ud kl. {clockTime(place.news.sentAt)}. Det står på jeres side resten af dagen.</p>
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
          {canNotify && (
            <label className="mt-3 flex items-start gap-3 rounded-2xl border-2 border-line bg-paper px-4 py-3 text-lg">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-ink" />
              <span>
                <span className="block font-bold">Send en besked til {followers === 1 ? "jeres følger" : `jeres ${followers} følgere`}</span>
                <span className="block text-ink-soft">{cost}</span>
              </span>
            </label>
          )}
          {place.news && <p className="mt-2 text-ink-soft">Rettelsen kommer kun på jeres side. Der bliver ikke sendt en ny besked.</p>}
          {error && <p className="mt-1 font-bold text-signal">{error}</p>}
          <button onClick={send} disabled={busy || !text.trim()} className="mt-3 min-h-14 w-full rounded-2xl bg-buoy px-4 text-lg font-bold disabled:opacity-50">
            {busy ? "Sender …" : sendLabel}
          </button>
          {place.news && (
            <button onClick={() => setEditing(false)} className="mt-1 w-full py-2 text-lg underline">
              Fortryd
            </button>
          )}
          {!place.news && !!followers && !canNotify && <p className="mt-2 text-ink-soft">I har brugt jeres gratis beskeder i denne måned. Vælg en pakke under Jeres pakke for at sende flere. Tilbuddet kommer stadig på jeres side.</p>}
          {!place.news && <p className="mt-2 text-ink-soft">Højst én besked om dagen, så ingen bliver trætte af jer.</p>}
        </>
      )}
    </div>
  );
}
