// Restauranten tager et billede af sit menukort, og AI'en skriver retterne ind.
// Her er, hvad AI'en skal svare, og hvordan svaret bliver til et forslag i menukort-skærmen.
// Intet gemmes, før restauranten selv har set det igennem og trykket Gem.

export const MAX_PHOTOS = 4;
// Vercel tager højst 4,5 MB pr. kald, så billederne gøres mindre på telefonen først
export const MAX_UPLOAD_CHARS = 4_200_000;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];
export const isPhotoType = (v: unknown): v is PhotoType => typeof v === "string" && (PHOTO_TYPES as readonly string[]).includes(v);

export type ReadItem = { name: string; description: string; price: number | null }; // null: prisen kunne ikke læses
export type ReadCategory = { name: string; items: ReadItem[]; sizes: { name: string; extra: number }[]; extras: { name: string; price: number }[] };
export type ReadAnswer = { categories: ReadCategory[]; note: string };

const choice = (priceKey: "extra" | "price") => ({
  type: "array",
  items: { type: "object", properties: { name: { type: "string" }, [priceKey]: { type: "number" } }, required: ["name", priceKey], additionalProperties: false },
});

export const READ_SCHEMA = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sizes: choice("extra"),
          extras: choice("price"),
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, description: { type: "string" }, price: { anyOf: [{ type: "number" }, { type: "null" }] } },
              required: ["name", "description", "price"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "sizes", "extras", "items"],
        additionalProperties: false,
      },
    },
    note: { type: "string" },
  },
  required: ["categories", "note"],
  additionalProperties: false,
};

export const READ_SYSTEM = `Du får billeder af et dansk spisesteds menukort. Skriv retterne ind præcis som de står, så restauranten kan lægge dem på sin side.
Regler:
- Brug kategorierne fra kortet, fx Pizza, Burger, Børnemenu, Drikkevarer. Har kortet ingen, så lav nogle få fornuftige.
- name: rettens navn som på kortet. Har retten et nummer foran (fx "12. Hawaii"), så behold nummeret, for kunderne bestiller tit efter nummer.
- description: teksten om retten, fx hvad der er i. Tom streng, hvis der ingen er. Find ikke på noget.
- price: prisen i kroner som tal (89,50 bliver 89.5). Kan prisen ikke læses sikkert, så null. Gæt aldrig en pris.
- Har retterne flere størrelser (fx Alm. og Familie, eller 25 cm og 30 cm), så er price den første størrelses pris. Læg størrelserne i sizes for kategorien: den første med extra 0, de andre med hvad de koster ekstra. Varierer forskellen, så brug den, der passer til flest retter.
- Tilvalg for hele kategorien (fx "ekstra ost 10 kr") lægges i extras.
- Spring over: åbningstider, adresse, telefon, reklame og andet, der ikke er en ret.
- Er det samme menukort fordelt på flere billeder, så sæt det sammen og skriv ikke en ret to gange.
- note: én kort sætning på dansk til restauranten, hvis noget var svært at læse eller manglede. Ellers tom streng.
- Er billedet ikke et menukort, eller kan det ikke læses, så svar med en tom liste og forklar det i note.`;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const kroner = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10000 ? Math.round(v * 100) / 100 : null);

/** Ryd op i AI'ens svar, så det passer til menukortets grænser (som i cleanDetails) */
export function cleanRead(raw: unknown): ReadAnswer {
  const r = raw as { categories?: unknown; note?: unknown } | null;
  const categories: ReadCategory[] = [];
  let count = 0;
  for (const c of Array.isArray(r?.categories) ? r.categories : []) {
    if (categories.length >= 30 || count >= 300) break;
    const items: ReadItem[] = [];
    for (const i of Array.isArray(c?.items) ? c.items : []) {
      const name = str(i?.name, 80);
      if (!name || count >= 300) continue;
      items.push({ name, description: str(i?.description, 200), price: kroner(i?.price) });
      count++;
    }
    if (!items.length) continue;
    const list = (v: unknown, key: "extra" | "price") =>
      (Array.isArray(v) ? v : [])
        .map((x) => ({ name: str(x?.name, 40), value: kroner(x?.[key]) ?? 0 }))
        .filter((x) => x.name)
        .slice(0, 10);
    const sizes = list(c?.sizes, "extra").map(({ name, value }) => ({ name, extra: value }));
    categories.push({
      name: str(c?.name, 60) || "Menu",
      items,
      // Én størrelse er ingen størrelse
      sizes: sizes.length > 1 ? sizes.map((s, i) => (i === 0 ? { ...s, extra: 0 } : s)) : [],
      extras: list(c?.extras, "price").map(({ name, value }) => ({ name, price: value })),
    });
  }
  return { categories, note: str(r?.note, 300) };
}

type Mergeable = { name: string; items: { id: string; name: string }[]; sizes: unknown[]; extras: unknown[] };
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Læg det læste menukort ind. "replace": det læste bliver menukortet, men retter med samme navn som før
 * beholder deres id (så udsolgt og kurve følger med). "add": nye retter lægges under det, der står,
 * i samme kategori, hvis navnet passer, og retter, der allerede findes, springes over.
 */
export function combineMenus<C extends Mergeable>(old: C[], read: C[], how: "replace" | "add"): C[] {
  const named = old.filter((c) => c.name.trim() || c.items.some((i) => i.name.trim()));
  if (how === "replace") {
    const oldItems = named.flatMap((c) => c.items);
    return read.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i, id: oldItems.find((o) => o.name.trim() && same(o.name, i.name))?.id ?? i.id })) }));
  }
  const result = named.map((c) => ({ ...c, items: [...c.items] }));
  for (const c of read) {
    const target = result.find((o) => same(o.name, c.name));
    if (!target) {
      result.push(c);
      continue;
    }
    target.items.push(...c.items.filter((i) => !target.items.some((o) => same(o.name, i.name))));
    if (!target.sizes.length && !target.extras.length) Object.assign(target, { sizes: c.sizes, extras: c.extras });
  }
  return result;
}
