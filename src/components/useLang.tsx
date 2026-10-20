"use client";

import { createContext, useContext, useMemo } from "react";
import { translator, type Lang, type T } from "@/lib/i18n";

// Sproget på kundens sider. Sættes i layout.tsx ud fra valget eller telefonens sprog.
// Sider med et steds menu lægger en LangProvider mere udenom med de oversatte retter.
const LangContext = createContext<{ lang: Lang; t: T }>({ lang: "da", t: translator("da") });

export function LangProvider({ lang, texts, children }: { lang: Lang; texts: Record<string, string>; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: translator(lang, texts) }), [lang, texts]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
