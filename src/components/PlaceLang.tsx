import { chooseLang, translatePlace } from "@/lib/translate";
import type { Place } from "@/lib/types";
import { LangProvider } from "./useLang";

// Omkring sider med et steds retter: kassen, bekræftelsen og fællesbestillingen får de oversatte navne med
export async function PlaceLang({ place, children }: { place: Place | null; children: React.ReactNode }) {
  const lang = await chooseLang();
  const { texts } = place ? await translatePlace(place, lang) : { texts: {} };
  return (
    <LangProvider lang={lang} texts={texts}>
      {children}
    </LangProvider>
  );
}
