"use client";

import Link from "next/link";
import { useActiveGroup } from "./useGroup";
import { useLang } from "./useLang";

// Over menukortet: start en fællesbestilling, eller gå tilbage til den, man er med i
export function GroupLink({ slug }: { slug: string }) {
  const active = useActiveGroup(slug);
  const { t } = useLang();
  if (active) {
    return (
      <Link href={`/faelles/${active}`} className="mt-3 flex items-center justify-between gap-3 border-2 border-ink bg-buoy-soft px-4 py-3 text-lg">
        <span>
          <span className="block font-bold">{t("Du er med i en fællesbestilling")}</span>
          <span className="block text-ink-soft">{t("Vælg din mad her, og læg den i bagefter.")}</span>
        </span>
        <span className="shrink-0 font-bold">{t("Se den ›")}</span>
      </Link>
    );
  }
  return (
    <Link href={`/sted/${slug}/faelles`} className="mt-3 flex items-center justify-between gap-3 border-y border-line py-3 text-lg">
      <span>
        <span className="block font-bold">{t("Bestiller I sammen?")}</span>
        <span className="block text-ink-soft">{t("Del et link, så vælger alle selv deres mad. Det bliver én bestilling.")}</span>
      </span>
      <span className="shrink-0 font-bold text-stamp">{t("Start ›")}</span>
    </Link>
  );
}
