"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import { useLang } from "./useLang";

// Dansk · English · Deutsch. Valget huskes på telefonen og gælder alle sider.
export function LangSwitch({ className = "mt-3" }: { className?: string }) {
  const { lang } = useLang();
  const router = useRouter();
  const choose = (next: Lang) => {
    document.cookie = `sprog=${next}; path=/; max-age=${60 * 60 * 24 * 60}; samesite=lax`;
    router.refresh();
  };
  return (
    <nav aria-label="Sprog / Language / Sprache" className={`${className} flex flex-wrap gap-2`}>
      {LANGS.map((l) => (
        <button
          key={l.lang}
          lang={l.lang}
          onClick={() => choose(l.lang)}
          aria-pressed={l.lang === lang}
          className={`border-2 border-ink px-3 py-1 font-bold ${l.lang === lang ? "bg-ink text-paper" : ""}`}
        >
          {l.name}
        </button>
      ))}
    </nav>
  );
}

// Mens menuen bliver oversat, spørger siden selv igen hvert par sekunder
export function RefreshWhileTranslating({ lang }: { lang: Lang }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      if (++tries > 20) clearInterval(timer);
      else router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [router, lang]);
  return null;
}
