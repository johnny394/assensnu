import { NextResponse } from "next/server";
import { askJson, canUseAI, clientIp, tooMany } from "@/lib/ai";
import { HENSYN, isHensynId } from "@/lib/hensyn";
import { parseLang } from "@/lib/i18n";
import { dishes, dishLine, MAX_QUESTION, plainAnswer, toPick, type OracleAnswer } from "@/lib/oracle";
import { CITY } from "@/lib/site";
import { store } from "@/lib/store";

// Mad-oraklet: "Jeg har tømmermænd og vil have comfort food under 100 kr." giver tre retter med en kort begrundelse.
// Uden AI (eller hvis den er langsom eller siger fejl) bruges en enkel ordsøgning, så kunden altid får et svar.

const SCHEMA = {
  type: "object",
  properties: {
    intro: { type: "string" },
    picks: {
      type: "array",
      items: { type: "object", properties: { n: { type: "integer" }, why: { type: "string" } }, required: ["n", "why"], additionalProperties: false },
    },
  },
  required: ["intro", "picks"],
  additionalProperties: false,
};

const LANG_NAME = { da: "dansk", en: "engelsk", de: "tysk" } as const;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { question?: unknown; slug?: unknown; lang?: unknown; hensyn?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, MAX_QUESTION) : "";
  if (question.length < 2) return NextResponse.json({ error: "Skriv hvad du har lyst til." }, { status: 400 });
  const slug = typeof body?.slug === "string" ? body.slug : undefined;
  const lang = parseLang(body?.lang) ?? "da";
  const hensyn = Array.isArray(body?.hensyn) ? body.hensyn.filter(isHensynId) : [];

  const all = dishes(await store.getPlaces(), new Date(), slug);
  if (all.length === 0) return NextResponse.json({ intro: "Der er ingen retter at vælge imellem endnu.", picks: [], ai: false } satisfies OracleAnswer);

  if (!canUseAI() || tooMany(`orakel:${clientIp(req)}`, 8)) return NextResponse.json(plainAnswer(question, all));

  try {
    const answer = await askJson<{ intro: string; picks: { n: number; why: string }[] }>(
      `Du er "Mad-oraklet" i en lokal madportal i ${CITY}. Kunden skriver, hvad de har lyst til, og du vælger op til tre retter fra listen. ` +
        "Hver linje i listen er: nummer | sted | åben nu eller lukket nu | leverer | køkken | kategori | ret | pris | beskrivelse. " +
        "Vælg kun retter, der står på listen, og svar med deres nummer. Foretræk steder med åbent nu, helst forskellige steder. Hold dig til kundens budget og antal personer. " +
        "Står der noget om levering, så vælg steder, der leverer. Har kunden hensyn, så undgå retter, der ser ud til at bryde dem. " +
        `Skriv intro (højst 12 ord) og en kort, sjov og venlig begrundelse pr. ret (højst 18 ord), på ${LANG_NAME[lang]}, i en uformel, lokal tone, som alle aldre forstår. ` +
        "Ingen emojis. Lov aldrig noget om allergener. Passer intet, så returnér en tom liste og sig det venligt i intro.",
      `Kunden skriver: ${JSON.stringify(question)}\n${hensyn.length ? `Kundens hensyn: ${hensyn.map((h) => HENSYN.find((x) => x.id === h)!.label).join(", ")}\n` : ""}\nRetter:\n${all.map(dishLine).join("\n")}`,
      SCHEMA,
      500,
    );
    const seen = new Set<number>();
    const picks = answer.picks
      .filter((p) => all[p.n] && !seen.has(p.n) && seen.add(p.n))
      .slice(0, 3)
      .map((p) => toPick(all[p.n], p.why.trim().slice(0, 200)));
    return NextResponse.json({ intro: answer.intro.trim().slice(0, 120), picks, ai: true } satisfies OracleAnswer);
  } catch (e) {
    console.error("Mad-oraklet gik galt", e);
    return NextResponse.json(plainAnswer(question, all));
  }
}
