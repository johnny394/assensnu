import "server-only";
import { askJson, canUseAI } from "./ai";
import { store } from "./store";
import { countTags, plainVibe, TAGS, VIBE_DAYS, VIBE_MIN } from "./tags";

// Byens stemning på 2 linjer: skrives igen, hver gang en kunde har bedømt en ordre.
// Højst én gang i kvarteret pr. sted, så AI'en ikke skriver hele tiden en travl fredag.

const lastRun = new Map<string, number>();

const SCHEMA = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
  additionalProperties: false,
};

const WEEKDAY = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", weekday: "long" });
const HOUR = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", hourCycle: "h23" });

export async function refreshVibe(slug: string) {
  if (Date.now() - (lastRun.get(slug) ?? 0) < 15 * 60_000) return;
  try {
    const rated = await store.recentTags(slug, new Date(Date.now() - VIBE_DAYS * 24 * 3600_000).toISOString());
    if (rated.length < VIBE_MIN) return;
    lastRun.set(slug, Date.now());
    const counts = countTags(rated);
    let text = plainVibe(counts, rated.length);
    if (canUseAI()) {
      text = await writeVibe(slug, rated, counts).catch((e) => {
        console.error("Kunne ikke skrive stemningen", e);
        return text;
      });
    }
    await store.saveVibe(slug, { text, count: rated.length, at: new Date().toISOString() });
  } catch (e) {
    console.error("Kunne ikke opdatere stemningen", e);
  }
}

async function writeVibe(slug: string, rated: { tags: string[]; createdAt: string }[], counts: ReturnType<typeof countTags>) {
  const place = await store.getPlace(slug);
  // Hvornår de lidt dårlige tags kom, så AI'en kan sige "fredag aften"
  const when = rated
    .filter((r) => r.tags.some((t) => t === "wait" || t === "lukewarm"))
    .map((r) => `${WEEKDAY.format(new Date(r.createdAt))} kl. ${HOUR.format(new Date(r.createdAt))}: ${r.tags.join(", ")}`)
    .slice(0, 20);
  const question = JSON.stringify({
    sted: place?.name ?? slug,
    køkken: place?.cuisines ?? [],
    bedømmelser: rated.length,
    tags: counts.map((c) => ({ tag: TAGS[c.tag].label, god: TAGS[c.tag].good, antal: c.count })),
    hvornår_de_mindre_gode_kom: when,
  });
  const { text } = await askJson<{ text: string }>(
    "Du skriver en ærlig, venlig opsummering til toppen af et spisesteds side i en lokal madportal i en lille dansk by. " +
      "Du får, hvor mange gange kunderne har trykket på hver mikro-tag. Skriv på dansk, højst to korte sætninger, i alt under 180 tegn. " +
      "Nævn det, kunderne roser mest. Nævn kun det mindre gode (ventetid, lunken mad), hvis mindst hver femte bedømmelse nævner det, og sig så gerne hvornår, hvis det samler sig om en bestemt dag eller aften. " +
      "Skriv som en lokal avis: jordnært og uden overdrivelser, ingen emojis, ingen udråbstegn, ingen tal. Opfind ikke noget, der ikke står i tallene.",
    question,
    SCHEMA,
    300,
  );
  const clean = text.trim();
  if (!clean || clean.length > 260) throw new Error("Stemningen passede ikke");
  return clean;
}
