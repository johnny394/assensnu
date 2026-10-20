import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { OfferPaper } from "@/components/Offers";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dagens tilbud · AssensNu", description: "Alle dagens tilbud fra spisesteder i Assens." };

export default async function OffersPage() {
  const places = await store.getPlaces();
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-3">
        <Link href="/" className="inline-block py-2 text-lg text-ink-soft">
          ‹ Alle steder
        </Link>
        <h1 className="mt-2 font-display text-[2.6rem] font-black leading-[1.02] tracking-tight">
          Dagens tilbud <span className="text-stamp">i Assens</span>
        </h1>
        <OfferPaper places={places} />
        <div className="h-24" />
      </main>
    </AppShell>
  );
}
