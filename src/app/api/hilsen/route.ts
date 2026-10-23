import { NextResponse } from "next/server";
import { askJson, canUseAI, clientIp, tooMany } from "@/lib/ai";
import type { Comeback } from "@/lib/badges";
import { parseLang } from "@/lib/i18n";
import { CITY } from "@/lib/site";

// "Det er længe siden ..."-hilsenen på forsiden til en fast kunde, der ikke har bestilt i 3 uger.
// Uden AI svarer vi { text: null }, og telefonen bruger sin egen faste tekst.
// Telefonen sender kun stedets navn, gaden, livretten og antal dage. Ikke hvem kunden er.

const SCHEMA = { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false };
const LANG_NAME = { da: "dansk", en: "engelsk", de: "tysk" } as const;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const c: Comeback = { slug: clip(body?.slug, 80), placeName: clip(body?.placeName, 80), street: clip(body?.street, 60), dish: clip(body?.dish, 80), days: Math.min(365, Math.max(0, Number(body?.days) || 0)) };
  const lang = parseLang(body?.lang) ?? "da";
  if (!c.placeName) return NextResponse.json({ error: "Mangler stedet." }, { status: 400 });

  if (!canUseAI() || tooMany(`hilsen:${clientIp(req)}`, 4)) return NextResponse.json({ text: null });
  try {
    const { text } = await askJson<{ text: string }>(
      `Du skriver en kort, venlig og lokal hilsen på forsiden af en madportal i ${CITY} til en fast kunde, der ikke har bestilt i et stykke tid. ` +
        `Skriv på ${LANG_NAME[lang]}, én eller to korte sætninger, under 140 tegn, uformelt og varmt som en nabo, der kender én. Nævn livretten og gaden eller stedet. ` +
        "Slut gerne med et lille spørgsmål om at bestille. Ingen emojis, ingen skyld eller pres, ingen rabatter eller løfter.",
      JSON.stringify({ sted: c.placeName, gade: c.street, livret: c.dish, dage_siden: c.days }),
      SCHEMA,
      150,
    );
    const clean = text.trim();
    if (!clean || clean.length > 200) throw new Error("Hilsenen passede ikke");
    return NextResponse.json({ text: clean });
  } catch (e) {
    console.error("Hilsenen gik galt", e);
    return NextResponse.json({ text: null });
  }
}
