import { NextResponse } from "next/server";
import { askJson, canUseAI, clientIp, tooMany } from "@/lib/ai";
import { HENSYN, isHensynId, wordConflict, type HensynId } from "@/lib/hensyn";
import { parseLang } from "@/lib/i18n";
import { store } from "@/lib/store";

// Allergidetektiven: kunden har lagt en ret i kurven og har valgt hensyn (fx laktosefri).
// Ser retten ud til at indeholde noget af det, svarer vi { warn: true, what: "fløde" }. Ellers { warn: false }.
// Det er et gæt ud fra menuteksten, og kunden får altid at vide, at restauranten ved det sikkert.

const SCHEMA = {
  type: "object",
  properties: { warn: { type: "boolean" }, what: { type: "string" } },
  required: ["warn", "what"],
  additionalProperties: false,
};

// Samme ret og samme hensyn giver samme svar, så det huskes på serveren
const remembered = new Map<string, { warn: boolean; what: string }>();
const LANG_NAME = { da: "dansk", en: "engelsk", de: "tysk" } as const;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { slug?: unknown; itemId?: unknown; hensyn?: unknown; lang?: unknown } | null;
  const hensyn = [...new Set(Array.isArray(body?.hensyn) ? body.hensyn.filter(isHensynId) : [])] as HensynId[];
  const lang = parseLang(body?.lang) ?? "da";
  if (typeof body?.slug !== "string" || typeof body?.itemId !== "string" || hensyn.length === 0) return NextResponse.json({ warn: false });

  const place = await store.getPlace(body.slug);
  const item = place?.menu.flatMap((c) => c.items.map((i) => ({ ...i, category: c.name }))).find((i) => i.id === body.itemId);
  if (!item) return NextResponse.json({ warn: false });

  const key = `${place!.slug}:${item.id}:${item.name}:${item.description ?? ""}:${hensyn.sort().join(",")}:${lang}`;
  const hit = remembered.get(key);
  if (hit) return NextResponse.json(hit);

  const plain = () => {
    const c = wordConflict(item, hensyn);
    return c ? { warn: true, what: c.word } : { warn: false, what: "" };
  };

  let answer = plain();
  if (canUseAI() && !tooMany(`hensyn:${clientIp(req)}`, 20)) {
    try {
      const ai = await askJson<{ warn: boolean; what: string }>(
        "Du hjælper kunder i en dansk madportal. Du får en ret fra et menukort (kategori, navn, beskrivelse) og kundens hensyn. " +
          "Vurdér ud fra teksten og almindelig viden om retten, om den sandsynligvis indeholder noget, der bryder hensynene (fx fløde eller ost ved laktosefri, kød ved vegetar, hvede i pizzadej ved glutenfri). " +
          `Svar warn=true kun når det er ret sandsynligt. I what skriver du på ${LANG_NAME[lang]}, hvad den ser ud til at indeholde, som en kort navneform, fx "fløde" eller "ost og hvede". Ellers warn=false og what tom.`,
        JSON.stringify({ kategori: item.category, ret: item.name, beskrivelse: item.description ?? "", hensyn: hensyn.map((h) => HENSYN.find((x) => x.id === h)!.label) }),
        SCHEMA,
        120,
      );
      const what = ai.what.trim().slice(0, 60);
      answer = ai.warn && what ? { warn: true, what } : { warn: false, what: "" };
    } catch (e) {
      console.error("Allergidetektiven gik galt", e);
    }
  }
  remembered.set(key, answer);
  if (remembered.size > 5000) remembered.clear();
  return NextResponse.json(answer);
}
