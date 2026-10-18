"use client";

import Link from "next/link";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-5 py-16 text-center">
      <h1 className="font-display text-3xl font-black tracking-tight">Ups, noget gik galt</h1>
      <p className="mt-3 text-lg text-ink-soft">Prøv igen om lidt. Bliver det ved, kan du se hvad der mangler på opsætningssiden.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="min-h-12 bg-ink px-5 text-lg font-bold text-paper">
          Prøv igen
        </button>
        <Link href="/status" className="flex min-h-12 items-center border-2 border-ink px-5 text-lg font-bold">
          Se opsætning
        </Link>
      </div>
    </main>
  );
}
