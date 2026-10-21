"use client";

import Link from "next/link";

// "Mad klar kl. 19.15": husker tiden, så kassen har den valgt, når man kommer dertil
export const pickupKey = (slug: string) => `assensnu:klar:${slug}`;

export function PickupLink({ slug, time, children }: { slug: string; time: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/sted/${slug}`}
      onClick={() => {
        try {
          sessionStorage.setItem(pickupKey(slug), time);
        } catch {}
      }}
      className="border-2 border-ink px-4 py-2.5 text-lg font-bold"
    >
      {children}
    </Link>
  );
}
