"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { translator, type Lang, type T } from "@/lib/i18n";

// Sproget på stedets side. Uden LangProvider er alt på dansk som altid.
const LangContext = createContext<{ lang: Lang; t: T }>({ lang: "da", t: translator("da") });

export function LangProvider({ lang, texts, children }: { lang: Lang; texts: Record<string, string>; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: translator(lang, texts) }), [lang, texts]);
  // Husker valget, så næste sted også står på samme sprog
  useEffect(() => {
    document.cookie = `sprog=${lang}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }, [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
