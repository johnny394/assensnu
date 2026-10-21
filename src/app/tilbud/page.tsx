import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { OfferPaper } from "@/components/Offers";
import { LangProvider } from "@/components/useLang";
import { store } from "@/lib/store";
import { translator } from "@/lib/i18n";
import { chooseLang, translateFrontPage } from "@/lib/translate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dagens tilbud · AssensNu", description: "Alle dagens tilbud fra spisesteder i Assens." };

export default async function OffersPage() {
  const places = await store.getPlaces();
  const lang = await chooseLang();
  const { texts } = await translateFrontPage(places, lang);
  const t = translator(lang, texts);
  return (
    <LangProvider lang={lang} texts={texts}>
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 pt-3">
        <Link href="/" className="inline-block py-2 text-lg text-ink-soft">
          {t("‹ Alle steder")}
        </Link>
        <h1 className="mt-2 font-display text-[2.6rem] font-black leading-[1.02] tracking-tight">
          {t("Dagens tilbud")} <span className="text-stamp">{t("i Assens")}</span>
        </h1>
        <OfferPaper places={places} />
        <div className="h-24" />
      </main>
    </AppShell>
    </LangProvider>
  );
}
