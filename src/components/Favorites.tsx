"use client";

import Link from "next/link";
import type { Place } from "@/lib/types";
import { PlaceBrowser } from "./PlaceBrowser";
import { useFavorites } from "./useFavorites";

export function Favorites({ places }: { places: Place[] }) {
  const { favorites } = useFavorites();
  const mine = places.filter((p) => favorites.includes(p.slug));

  if (mine.length === 0) {
    return (
      <>
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight">Dine favoritter</h1>
        <div className="mt-6 rounded-3xl bg-surface px-5 py-6 text-lg">
          <p>Tryk på hjertet hos et spisested, så ligger det her og er hurtigt at finde.</p>
          <Link href="/" className="mt-3 inline-block font-bold text-sea underline">Find et spisested</Link>
        </div>
      </>
    );
  }
  return <PlaceBrowser places={mine} title="Dine favoritter" />;
}
