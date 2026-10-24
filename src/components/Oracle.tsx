"use client";

import { useState } from "react";
import { kr } from "@/lib/format";
import { MAX_QUESTION, type OracleAnswer } from "@/lib/oracle";
import { useHensyn } from "./useStored";
import { useLang } from "./useLang";

const TOWN_EXAMPLES = ["Tømmermænd. Comfort food under 100 kr.", "Aftensmad til 4, gerne levering", "Noget vegetarisk og mættende"];
const PLACE_EXAMPLES = ["Hvad er mest mættende?", "Noget til 2 under 200 kr.", "Noget uden kød"];

// Mad-oraklet: skriv med dine egne ord, hvad du har lyst til. Som en brevkasse i lokalavisen.
// slug: kun stedets egne retter (på menukortet)
// På forsiden starter oraklet som én linje, ligesom et søgefelt, og folder først ud, når man trykker på det.
export function Oracle({ slug }: { slug?: string }) {
  const { lang, t } = useLang();
  const { hensyn } = useHensyn();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<OracleAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const compact = !slug && !open && !answer && !busy && !error;

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 2 || busy) return;
    setQuestion(text);
    setAsked(text);
    setBusy(true);
    setError(false);
    const res = await fetch("/api/orakel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: text, slug, lang, hensyn }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as OracleAnswer | null;
    setBusy(false);
    if (!res?.ok || !data) return setError(true);
    setAnswer(data);
  }

  return (
    <section className={compact ? "mt-4" : "mt-5 border-2 border-ink bg-surface px-4 pb-4 pt-3"}>
      {!compact && (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-stamp">{t("Spørg Mad-oraklet")}</p>
          {!slug && !answer && !busy && (
            <button type="button" onClick={() => {
                setOpen(false);
                setError(false);
              }}
              className="py-1 text-sm font-bold underline">
              {t("Luk")}
            </button>
          )}
        </div>
      )}
      {slug && <p className="mt-0.5 font-display text-xl font-semibold leading-snug">{t("Skriv, hvad du har lyst til, så finder oraklet det på menuen.")}</p>}
      {!slug && !compact && !answer && !busy && <p className="mt-0.5 text-base text-ink-soft">{t("Skriv, hvad du har lyst til, så finder oraklet det i byen.")}</p>}
      <form
        className={compact ? "flex border-2 border-ink bg-surface" : "mt-3 flex gap-2"}
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setOpen(true)}
          maxLength={MAX_QUESTION}
          enterKeyHint="search"
          aria-label={t("Hvad har du lyst til?")}
          placeholder={compact ? `${t("Spørg Mad-oraklet")} …` : t("Fx noget varmt og billigt")}
          className={
            compact
              ? "min-w-0 flex-1 bg-transparent px-3 py-2.5 text-lg outline-none placeholder:text-ink-soft"
              : "min-w-0 flex-1 border-2 border-ink bg-paper px-3 py-3 text-lg outline-none placeholder:text-ink-soft focus:border-stamp"
          }
        />
        <button
          disabled={busy || (!compact && question.trim().length < 2)}
          onClick={(e) => {
            // I den lille udgave åbner knappen bare oraklet, så man kan se eksemplerne
            if (compact && question.trim().length < 2) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={compact ? "shrink-0 bg-ink px-4 text-lg font-bold text-paper" : "shrink-0 bg-ink px-4 text-lg font-bold text-paper disabled:opacity-50"}
        >
          {t("Spørg")}
        </button>
      </form>
      {!compact && !answer && !busy && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {(slug ? PLACE_EXAMPLES : TOWN_EXAMPLES).map((ex) => (
            <button key={ex} type="button" onClick={() => ask(t(ex))} className="py-1 text-left text-base italic text-ink-soft underline decoration-dotted underline-offset-4">
              »{t(ex)}«
            </button>
          ))}
        </div>
      )}

      {busy && <p className="mt-4 animate-pulse text-lg italic text-ink-soft">{t("Oraklet kigger i menukortene …")}</p>}
      {error && <p className="mt-4 text-lg font-bold text-stamp">{t("Oraklet svarer ikke lige nu. Prøv igen om lidt.")}</p>}

      {answer && !busy && (
        <div className="mt-4" aria-live="polite">
          <p className="text-ink-soft">
            {t("Du spurgte:")} <span className="italic">»{asked}«</span>
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{answer.ai ? answer.intro : t(answer.intro)}</p>
          {answer.picks.length > 0 && (
            <ol className="mt-2 border-t border-ink">
              {answer.picks.map((p) => (
                <li key={`${p.slug}:${p.itemId}`} className="border-b border-ink">
                  <a href={slug ? `#ret-${p.itemId}` : `/sted/${p.slug}#ret-${p.itemId}`} className="block py-3 active:bg-paper">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-xl font-semibold">{t(p.name)}</span>
                      <span className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-ink-soft/60" aria-hidden />
                      <span className="whitespace-nowrap font-bold tabular-nums">{kr(p.price)}</span>
                    </span>
                    {!slug && (
                      <span className="block text-sm uppercase tracking-[0.1em] text-ink-soft">
                        {p.placeName}
                        {!p.open && <span className="font-bold"> · {t("Lukket nu")}</span>}
                      </span>
                    )}
                    <span className="mt-0.5 block text-lg">{answer.ai ? p.why : t(p.why)}</span>
                  </a>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">{t("Oraklet gætter ud fra menukortene. Allergier? Spørg altid stedet.")}</p>
            <button
              type="button"
              onClick={() => {
                setAnswer(null);
                setQuestion("");
                setOpen(false);
              }}
              className="shrink-0 py-1 font-bold underline"
            >
              {t("Spørg igen")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
