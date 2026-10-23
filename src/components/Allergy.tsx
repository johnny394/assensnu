"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HENSYN } from "@/lib/hensyn";
import type { MenuItem } from "@/lib/types";
import { addToNote, useHensyn } from "./useStored";
import { useLang } from "./useLang";

// Dine hensyn: laktosefri, vegetar og så videre. Telefonen husker dem.
export function HensynPicker() {
  const { t } = useLang();
  const { hensyn, toggle } = useHensyn();
  const [open, setOpen] = useState(false);
  const chosen = HENSYN.filter((h) => hensyn.includes(h.id));

  return (
    <div className="mt-3 border-y border-ink py-2.5">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left text-lg">
        <span>
          <span className="font-bold">{t("Dine hensyn:")}</span>{" "}
          <span className={chosen.length ? "" : "text-ink-soft"}>{chosen.length ? chosen.map((h) => t(h.label)).join(", ") : t("ingen valgt")}</span>
        </span>
        <span className="shrink-0 font-bold underline">{t(open ? "Luk" : chosen.length ? "Ret" : "Vælg")}</span>
      </button>
      {open && (
        <>
          <p className="mt-1 text-ink-soft">{t("Så siger vi til, hvis en ret ser ud til at indeholde noget af det.")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HENSYN.map((h) => {
              const on = hensyn.includes(h.id);
              return (
                <button key={h.id} onClick={() => toggle(h.id)} aria-pressed={on} className={`border-2 border-ink px-3 py-2 text-base ${on ? "bg-ink font-bold text-paper" : "bg-transparent"}`}>
                  {t(h.label)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

type Warning = { dish: string; what: string };

// Allergidetektiven: når en ret lægges i kurven, spørges der i baggrunden, om den passer til kundens hensyn.
// Kurven venter aldrig på svaret. Kommer der en advarsel, vises en lille besked over kurven.
export function useDetective(slug: string) {
  const { lang, t } = useLang();
  const { hensyn } = useHensyn();
  const [warning, setWarning] = useState<Warning | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const check = useCallback(
    (item: MenuItem) => {
      if (hensyn.length === 0) return;
      fetch("/api/hensyn", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, itemId: item.id, hensyn, lang }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { warn?: boolean; what?: string } | null) => {
          if (!data?.warn || !data.what) return;
          setWarning({ dish: item.name, what: data.what });
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setWarning(null), 12_000);
        })
        .catch(() => {});
    },
    [slug, hensyn, lang],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  const toast = warning && (
    <div role="status" className="fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-20 px-4">
      <div className="mx-auto max-w-2xl border-2 border-ink bg-paper px-4 py-3 shadow-[3px_3px_0_var(--color-ink)]">
        <p className="text-lg">
          <span className="font-bold">{t("Bemærk:")}</span> {t("{ret} ser ud til at indeholde {hvad}.", { ret: t(warning.dish), hvad: warning.what })} {t("Vil du skrive det til køkkenet?")}
        </p>
        <div className="mt-2 flex items-center gap-4">
          <button
            onClick={() => {
              // Køkkenet læser dansk
              addToNote(slug, `${warning.dish}: uden ${warning.what}, hvis det kan lade sig gøre.`);
              setWarning(null);
            }}
            className="bg-ink px-4 py-2.5 text-lg font-bold text-paper"
          >
            {t("Skriv til køkkenet")}
          </button>
          <button onClick={() => setWarning(null)} className="py-2 text-lg underline">
            {t("Det er fint")}
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{t("Det er et gæt ud fra menuen. Ved allergi: spørg altid stedet.")}</p>
      </div>
    </div>
  );
  return { check, toast };
}
