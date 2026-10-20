"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import { useLang } from "./useLang";

// Dansk · English · Deutsch øverst på stedets side
export function LangSwitch({ slug }: { slug: string }) {
  const { lang } = useLang();
  return (
    <nav aria-label="Sprog / Language / Sprache" className="mt-3 flex flex-wrap gap-2">
      {LANGS.map((l) =>
        l.lang === lang ? (
          <span key={l.lang} aria-current="true" className="border-2 border-ink bg-ink px-3 py-1 font-bold text-paper">
            {l.name}
          </span>
        ) : (
          <a key={l.lang} href={`/sted/${slug}?sprog=${l.lang}`} hrefLang={l.lang} lang={l.lang} className="border-2 border-ink px-3 py-1 font-bold">
            {l.name}
          </a>
        ),
      )}
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
