import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { langFromHeader, parseLang, placeTexts, translator, type Lang } from "./i18n";
import { store } from "./store";
import type { Place } from "./types";

// Menukortet på engelsk og tysk. Claude oversætter hver tekst én gang, og den gemmes i databasen,
// så næste turist får den med det samme. Nøglen ANTHROPIC_API_KEY står kun på Vercel.

export type MenuTranslation = {
  texts: Record<string, string>; // dansk tekst → oversat
  state: "done" | "working" | "off"; // off: ingen nøgle eller fejl, så menuen står på dansk
};

const NAMES: Record<Exclude<Lang, "da">, string> = { en: "English", de: "German" };
const working = new Set<string>(); // oversættelser i gang på denne server, så de ikke startes to gange
const failedAt = new Map<string, number>(); // prøv ikke igen hvert sekund, hvis noget går galt
const remembered = new Map<string, string>(); // også i serverens hukommelse, hvis databasen mangler tabellen

export const canTranslate = () => !!process.env.ANTHROPIC_API_KEY?.trim();

// Sproget: det, man valgte sidst med knapperne, ellers telefonens sprog
export async function chooseLang(): Promise<Lang> {
  return parseLang((await cookies()).get("sprog")?.value) ?? langFromHeader((await headers()).get("accept-language"));
}

// Til overskrifter på serverens sider
export async function pageT(texts?: Record<string, string>) {
  return translator(await chooseLang(), texts);
}

// Det, stedets side skal bruge. Mangler noget, oversættes det bagefter, og siden spørger igen om lidt.
export const translatePlace = (place: Place, lang: Lang) => translateTexts(placeTexts(place), lang);

// Forsiden: køkkentyper og dagens tilbud fra alle steder
export function translateFrontPage(places: Place[], lang: Lang) {
  const sources = places.flatMap((p) => [...p.cuisines, ...(p.news ? [p.news.text] : [])]);
  return translateTexts([...new Set(sources.map((s) => s.trim()).filter(Boolean))], lang);
}

async function translateTexts(sources: string[], lang: Lang): Promise<MenuTranslation> {
  if (lang === "da") return { texts: {}, state: "done" };
  const saved = await store.getTranslations(lang, sources).catch((e) => {
    console.error("Kunne ikke hente oversættelser", e);
    return {} as Record<string, string>;
  });
  const texts = { ...fromMemory(lang, sources), ...saved };
  const missing = sources.filter((s) => !(s in texts));
  if (missing.length === 0) return { texts, state: "done" };
  if (!canTranslate() || Date.now() - (failedAt.get(lang) ?? 0) < 60_000) return { texts, state: "off" };
  after(() => fillMissing(lang, missing));
  return { texts, state: "working" };
}

// Når restauranten gemmer menuen eller dagens tilbud, oversættes det nye med det samme
export async function warmTranslations(slug: string) {
  if (!canTranslate()) return;
  const place = await store.getPlace(slug);
  if (!place) return;
  for (const lang of ["en", "de"] as const) {
    const sources = placeTexts(place);
    const have = { ...fromMemory(lang, sources), ...(await store.getTranslations(lang, sources).catch(() => ({}))) };
    await fillMissing(lang, sources.filter((s) => !(s in have)));
  }
}

async function fillMissing(lang: Exclude<Lang, "da">, missing: string[]) {
  const todo = missing.filter((s) => !working.has(`${lang}:${s}`));
  if (todo.length === 0) return;
  todo.forEach((s) => working.add(`${lang}:${s}`));
  try {
    for (let i = 0; i < todo.length; i += 80) {
      const part = todo.slice(i, i + 80);
      const translated = await askClaude(lang, part);
      part.forEach((s, j) => remembered.set(`${lang}:${s}`, translated[j]));
      await store.saveTranslations(lang, Object.fromEntries(part.map((s, j) => [s, translated[j]])));
    }
  } catch (e) {
    failedAt.set(lang, Date.now());
    console.error("Oversættelsen gik galt", e);
  } finally {
    todo.forEach((s) => working.delete(`${lang}:${s}`));
  }
}

const fromMemory = (lang: Lang, sources: string[]) =>
  Object.fromEntries(sources.flatMap((s) => (remembered.has(`${lang}:${s}`) ? [[s, remembered.get(`${lang}:${s}`)!]] : [])));

const SCHEMA = {
  type: "object",
  properties: { translations: { type: "array", items: { type: "string" } } },
  required: ["translations"],
  additionalProperties: false,
};

async function askClaude(lang: Exclude<Lang, "da">, texts: string[]): Promise<string[]> {
  const client = new Anthropic();
  const message = await client.beta.messages
    .stream({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system:
        `You translate restaurant menus in Assens, Denmark, from Danish into ${NAMES[lang]} for tourists. ` +
        "The texts are dish names, descriptions, menu categories, sizes, extras, cuisine types and short notes the restaurant wrote. " +
        "Translate so a tourist understands what the food is. Keep names that are already international (Pizza Margherita, Carbonara, Burger) as they are, " +
        "and keep numbers, prices and units exactly. Keep the tone short and plain, like a menu. Do not add explanations. " +
        "Return one translation per input text, in the same order.",
      messages: [{ role: "user", content: JSON.stringify(texts) }],
    })
    .finalMessage();
  if (message.stop_reason === "refusal") throw new Error("Claude ville ikke oversætte teksten");
  if (message.stop_reason === "max_tokens") throw new Error("Oversættelsen blev for lang");
  const block = message.content.find((b) => b.type === "text");
  const result = block?.type === "text" ? (JSON.parse(block.text) as { translations: unknown }) : null;
  const list = result?.translations;
  if (!Array.isArray(list) || list.length !== texts.length || !list.every((t) => typeof t === "string" && t.trim())) {
    throw new Error("Oversættelsen passede ikke til teksterne");
  }
  return list.map((t: string) => t.trim());
}
