import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RefreshWhileTranslating } from "@/components/LangSwitch";
import { LangProvider } from "@/components/useLang";
import { PlaceBrowser } from "@/components/PlaceBrowser";
import { upcoming } from "@/lib/events";
import { todayInCopenhagen } from "@/lib/hours";
import { translator } from "@/lib/i18n";
import { store } from "@/lib/store";
import { chooseLang, translateFrontPage } from "@/lib/translate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await store.getPlaces();
  const today = todayInCopenhagen();
  // Sker der noget i aften, står det øverst med en genvej til at spise før
  const tonight = upcoming(await store.listEvents(today), today).filter((e) => e.date === today);
  const lang = await chooseLang();
  const translation = await translateFrontPage(places, lang, tonight);
  const t = translator(lang, translation.texts);
  return (
    <LangProvider lang={lang} texts={translation.texts}>
      <AppShell>
        <main lang={lang} className="mx-auto max-w-2xl px-5 pt-8">
          {tonight.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="mb-5 flex items-center justify-between gap-3 border-y-2 border-ink py-2.5 text-lg">
              <span>
                <span className="font-bold uppercase tracking-[0.12em] text-stamp">{t("I aften kl. {tid}", { tid: e.time })}</span> {t(e.title)}
              </span>
              <span className="shrink-0 font-bold underline">{t("Spis før ›")}</span>
            </Link>
          ))}
          <PlaceBrowser places={places} languages />
          {translation.state === "working" && <RefreshWhileTranslating lang={lang} />}
        </main>
      </AppShell>
    </LangProvider>
  );
}
