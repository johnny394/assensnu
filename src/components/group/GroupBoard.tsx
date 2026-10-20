"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import type { GroupView } from "@/lib/groups";
import { choiceText, parseKey, priceChoice } from "@/lib/menu-options";
import type { OrderLine, Place } from "@/lib/types";
import { field, label } from "../Checkout";
import { useCart } from "../useCart";
import { entryKeys, hostKey, joinGroup, leaveGroup, saveEntryKey } from "../useGroup";
import { usePolling } from "../usePolling";
import { useLang } from "../useLang";

const CUSTOMER_KEY = "assensnu:kunde";

// Siden, alle får linket til: hvem har lagt hvad i, og knappen til at lægge sin egen mad i
export function GroupBoard({ place, initial }: { place: Place; initial: GroupView }) {
  const [version, setVersion] = useState(0);
  const data = usePolling<GroupView>(`/api/groups/${initial.id}?v=${version}`, initial, 4000);
  const refresh = () => setVersion((v) => v + 1);
  const { cart, clear } = useCart(place.slug);
  const [host, setHost] = useState<string | null>(null);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLang();

  useEffect(() => {
    setHost(hostKey(initial.id));
    setMine(entryKeys());
    try {
      setName(JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}").name ?? "");
    } catch {}
  }, [initial.id]);
  // Mens den er åben, fører kurven på stedets side hertil. Bagefter er man ude af den igen.
  useEffect(() => {
    if (data.open) joinGroup(place.slug, data.id);
    else leaveGroup(place.slug, data.id);
  }, [data.open, data.id, place.slug]);

  const lines = Object.entries(cart).flatMap(([key, quantity]) => {
    const p = priceChoice(place, parseKey(key));
    return p.ok && !p.value.item.soldOut ? [{ key, quantity, ...p.value }] : [];
  });
  const myTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const people = data.entries.length;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/groups/${data.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, size: l.size, extras: l.extras })) }),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !body?.entryId) return setError(t(body?.error ?? "Det gik ikke. Tjek din forbindelse og prøv igen."));
    saveEntryKey(body.entryId, body.key);
    setMine(entryKeys());
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ ...saved, name }));
    } catch {}
    clear();
    refresh();
  }

  async function remove(entryId: string, who: string) {
    if (!confirm(t("Fjern maden til {navn} fra fællesbestillingen?", { navn: who }))) return;
    const res = await fetch(`/api/groups/${data.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entryId, key: mine[entryId] ?? host }),
    }).catch(() => null);
    if (!res?.ok) alert(t("Det gik ikke igennem. Prøv igen."));
    refresh();
  }

  return (
    <>
      <Link href={`/sted/${place.slug}`} className="inline-block py-2 text-lg text-ink-soft">
        ‹ {place.name}
      </Link>
      <h1 className="mt-2 font-display text-[2.3rem] font-black leading-tight tracking-tight">{t("Fællesbestilling")}</h1>
      <p className="text-lg text-ink-soft">{t("Hos {navn} · startet af {vært}", { navn: data.placeName, vært: data.hostName })}</p>

      {data.orderId && (
        <div className="mt-6 border-2 border-go bg-go-soft px-5 py-4 text-lg">
          <p className="font-bold">{t("Bestillingen er sendt til {navn}.", { navn: data.placeName })}</p>
          <Link href={`/ordre/${data.orderId}`} className="mt-1 inline-block font-bold underline">
            {t("Følg bestillingen ›")}
          </Link>
        </div>
      )}
      {!data.open && !data.orderId && (
        <p className="mt-6 bg-stamp-soft px-4 py-3 text-lg text-stamp">{t("Den her fællesbestilling er udløbet. En fællesbestilling gælder kun samme dag.")}</p>
      )}

      {data.open && <ShareBox placeName={data.placeName} />}

      {data.open && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">{t("Din mad")}</h2>
          {lines.length === 0 && data.entries.some((e) => mine[e.id]) ? (
            <p className="mt-1 text-lg">
              {t("✓ Din mad er med.")}{" "}
              <Link href={`/sted/${place.slug}`} className="underline">
                {t("Vil du have mere med?")}
              </Link>
            </p>
          ) : lines.length === 0 ? (
            <>
              <p className="mt-1 text-lg text-ink-soft">{t("Vælg din mad på menukortet. Bagefter kommer du tilbage hertil.")}</p>
              <Link href={`/sted/${place.slug}`} className="mt-3 flex min-h-14 items-center justify-center bg-ink px-5 py-4 text-center text-lg font-bold text-paper">
                {t("Vælg din mad hos {navn}", { navn: place.name })}
              </Link>
            </>
          ) : (
            <form onSubmit={add} className="mt-2 space-y-4">
              <Lines lines={lines} />
              <Link href={`/sted/${place.slug}`} className="inline-block text-lg underline">
                {t("Ret i maden")}
              </Link>
              <div>
                <label htmlFor="name" className={label}>{t("Dit navn")}</label>
                <input id="name" required autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
                <p className="mt-1 text-ink-soft">{t("Så køkkenet ved, hvem maden er til.")}</p>
              </div>
              {error && <p className="font-bold text-stamp">{error}</p>}
              <button disabled={busy} className="min-h-14 w-full bg-stamp px-5 py-4 text-lg font-bold text-white disabled:opacity-60">
                {busy ? t("Et øjeblik …") : t("Læg min mad i · {pris}", { pris: kr(myTotal) })}
              </button>
            </form>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          {t(people === 0 ? "Ingen har lagt mad i endnu" : people === 1 ? "1 person er med" : "{n} personer er med", { n: people })}
        </h2>
        <ul className="mt-2 border-t-[3px] border-double border-ink">
          {data.entries.map((e) => (
            <li key={e.id} className="border-b border-line px-1 py-3">
              <p className="flex items-baseline justify-between gap-3 text-lg">
                <strong>
                  {e.name}
                  {mine[e.id] && <span className="font-normal text-ink-soft"> {t("(dig)")}</span>}
                </strong>
                <span className="tabular-nums">{kr(e.total)}</span>
              </p>
              <Lines lines={e.lines} quiet />
              {data.open && (mine[e.id] || host) && (
                <button onClick={() => remove(e.id, e.name)} className="mt-1 text-ink-soft underline">
                  {t("Fjern")}
                </button>
              )}
            </li>
          ))}
          {people > 0 && (
            <li className="flex justify-between border-t-2 border-ink px-1 py-3.5 text-xl font-bold">
              <span>{t("I alt")}</span>
              <span className="tabular-nums">{kr(data.total)}</span>
            </li>
          )}
        </ul>
      </section>

      {data.open &&
        (host ? (
          <div className="mt-8">
            {people === 0 ? (
              <p className="text-lg text-ink-soft">{t("Når de andre har lagt deres mad i, sender du det hele herfra.")}</p>
            ) : (
              <Link href={`/faelles/${data.id}/bestil`} className="flex min-h-14 items-center justify-center bg-stamp px-5 py-4 text-xl font-bold text-white">
                {t("Send bestillingen · {pris}", { pris: kr(data.total) })}
              </Link>
            )}
            <p className="mt-2 text-ink-soft">{t("Kun du kan sende den. Når den er sendt, kan der ikke lægges mere i.")}</p>
          </div>
        ) : (
          <p className="mt-8 border-2 border-ink bg-surface px-5 py-4 text-lg">
            {t("{vært} sender bestillingen, når alle er med. Siden her opdaterer sig selv.", { vært: data.hostName })}
          </p>
        ))}
    </>
  );
}

function Lines({ lines, quiet }: { lines: (Pick<OrderLine, "name" | "price" | "quantity" | "size" | "extras"> & { key?: string })[]; quiet?: boolean }) {
  const { t } = useLang();
  return (
    <ul className={quiet ? "text-ink-soft" : "text-lg"}>
      {lines.map((l, i) => (
        <li key={l.key ?? i} className="flex justify-between gap-3">
          <span>
            {l.quantity} × {t(l.name)}
            {choiceText(l) && <span className="block text-base">{choiceText(l, t)}</span>}
          </span>
          {!quiet && <span className="tabular-nums">{kr(l.price * l.quantity)}</span>}
        </li>
      ))}
    </ul>
  );
}

function ShareBox({ placeName }: { placeName: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();
  const share = async () => {
    const url = window.location.href;
    const text = t("Vi bestiller mad fra {navn}. Vælg din mad her:", { navn: placeName });
    if (navigator.share) {
      try {
        await navigator.share({ title: t("Fællesbestilling"), text, url });
        return;
      } catch {
        // Lukket uden at dele, eller ikke muligt. Så kopierer vi linket i stedet.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      prompt(t("Kopier linket og send det til de andre:"), url);
    }
  };
  return (
    <div className="mt-6 border-2 border-dashed border-stamp bg-stamp-soft px-4 py-4">
      <p className="text-lg font-bold">{t("Send linket til dem, der skal have mad med")}</p>
      <p className="text-ink-soft">{t("De vælger selv deres mad og skriver deres navn. Ingen skal oprette noget.")}</p>
      <button onClick={share} className="mt-3 min-h-14 w-full bg-ink px-5 py-3 text-lg font-bold text-paper">
        {t(copied ? "Linket er kopieret. Sæt det ind i en besked." : "Del linket")}
      </button>
    </div>
  );
}
