import { AppShell } from "@/components/AppShell";
import { RefreshWhileTranslating } from "@/components/LangSwitch";
import { LangProvider } from "@/components/useLang";
import { PlaceBrowser } from "@/components/PlaceBrowser";
import { store } from "@/lib/store";
import { chooseLang, translateFrontPage } from "@/lib/translate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await store.getPlaces();
  const lang = await chooseLang();
  const translation = await translateFrontPage(places, lang);
  return (
    <LangProvider lang={lang} texts={translation.texts}>
      <AppShell>
        <main lang={lang} className="mx-auto max-w-2xl px-5 pt-8">
          <PlaceBrowser places={places} languages />
          {translation.state === "working" && <RefreshWhileTranslating lang={lang} />}
        </main>
      </AppShell>
    </LangProvider>
  );
}
