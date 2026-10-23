"use client";

import Link from "next/link";
import type { Place } from "@/lib/types";
import { MyClub } from "./MyClub";
import { PlaceBrowser } from "./PlaceBrowser";
import { useFavorites } from "./useFavorites";
import { useLang } from "./useLang";

export function Favorites({ places }: { places: Place[] }) {
  const { favorites } = useFavorites();
  const mine = places.filter((p) => favorites.includes(p.slug));
  const { t } = useLang();

  if (mine.length === 0) {
    return (
      <>
        <h1 className="font-display text-[2.6rem] font-black leading-[1.02] tracking-tight">{t("Dine favoritter")}</h1>
        <div className="mt-6 border-y-[3px] border-double border-ink px-1 py-6 text-lg">
          <p>{t("Tryk på hjertet hos et spisested, så ligger det her og er hurtigt at finde.")}</p>
          <Link href="/" className="mt-3 inline-block font-bold text-ink underline decoration-stamp decoration-2 underline-offset-4">{t("Find et spisested")}</Link>
        </div>
        <MyClub />
      </>
    );
  }
  return (
    <>
      <PlaceBrowser places={mine} title={t("Dine favoritter")} />
      <MyClub />
    </>
  );
}
