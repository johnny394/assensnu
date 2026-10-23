import { openStatus } from "./hours";
import type { Place } from "./types";

// Mad-oraklet: kunden skriver, hvad de har lyst til, og får tre retter fra byens steder.
// Her er retterne, som oraklet kan vælge imellem, og en enkel søgning til, når AI'en ikke er med.

export type Dish = {
  n: number; // nummeret, som AI'en svarer med
  slug: string;
  placeName: string;
  itemId: string;
  name: string;
  description?: string;
  category: string;
  cuisines: string[];
  price: number;
  open: boolean;
  orders: boolean; // kan bestilles her
  delivery: boolean;
};

export type Pick = { slug: string; placeName: string; itemId: string; name: string; price: number; open: boolean; why: string };
export type OracleAnswer = { intro: string; picks: Pick[]; ai: boolean };

export const MAX_QUESTION = 200;
const MAX_DISHES = 400;

/** Alle retter fra steder, der er med. Steder med åbent først. place: kun ét sted (på menukortet). */
export function dishes(places: Place[], now = new Date(), slug?: string): Dish[] {
  const list: Omit<Dish, "n">[] = [];
  for (const p of places) {
    if (!p.member || (slug && p.slug !== slug)) continue;
    const open = openStatus(p, now).state === "open";
    for (const c of p.menu)
      for (const i of c.items) {
        if (i.soldOut) continue;
        list.push({ slug: p.slug, placeName: p.name, itemId: i.id, name: i.name, description: i.description, category: c.name, cuisines: p.cuisines, price: i.price, open, orders: p.acceptsOrders, delivery: !!p.delivery });
      }
  }
  return list
    .sort((a, b) => Number(b.open) - Number(a.open))
    .slice(0, MAX_DISHES)
    .map((d, n) => ({ ...d, n }));
}

/** Kort linje pr. ret til AI'en */
export const dishLine = (d: Dish) =>
  [d.n, d.placeName, d.open ? "åben nu" : "lukket nu", d.delivery ? "leverer" : "", d.cuisines.join("/"), d.category, d.name, `${d.price} kr`, d.description ?? ""].join(" | ");

export const toPick = (d: Dish, why: string): Pick => ({ slug: d.slug, placeName: d.placeName, itemId: d.itemId, name: d.name, price: d.price, open: d.open, why });

const STOP = new Set(["jeg", "vil", "have", "noget", "gerne", "til", "med", "og", "en", "et", "der", "er", "det", "som", "kan", "for", "under", "over", "kr", "kroner", "lidt", "godt", "god", "lækkert", "lyst", "mad", "på", "i", "af", "personer", "folk", "os", "mig", "hurtig", "hurtigt", "levering", "nu", "i dag", "aften", "the", "and", "want", "some", "food", "ich", "möchte", "etwas"]);
// Ord, der tit dækker over en madtype
const ALIASES: Record<string, string[]> = {
  "comfort": ["burger", "pizza", "pommes", "kebab", "durum", "lasagne"],
  "tømmermænd": ["burger", "pommes", "pizza", "kebab", "durum", "cola"],
  "børn": ["nuggets", "pommes", "pizza", "burger", "børn"],
  "vegetar": ["vegetar", "veggie", "falafel", "margherita", "salat"],
  "sundt": ["salat", "bowl", "sushi", "wrap"],
  "kaffe": ["kaffe", "latte", "cappuccino", "espresso"],
  "sødt": ["kage", "is", "dessert", "brownie", "cookie"],
};

/** Søgning uden AI: ord i navn, kategori, køkken og beskrivelse, og "under 100 kr." */
export function plainAnswer(question: string, all: Dish[]): OracleAnswer {
  const q = question.toLowerCase();
  const maxPrice = Number(q.match(/under\s*(\d+)/)?.[1]) || null;
  const people = Number(q.match(/(\d+)\s*(personer|pers|mennesker|people|personen)/)?.[1]) || 1;
  const words = new Set(q.split(/[^a-zæøåäöüé0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)));
  for (const [key, more] of Object.entries(ALIASES)) if (q.includes(key)) more.forEach((m) => words.add(m));

  const budget = (d: Dish) => !maxPrice || d.price <= maxPrice;
  const scored = all
    .filter(budget)
    .map((d) => {
      const name = d.name.toLowerCase();
      const rest = `${d.category} ${d.cuisines.join(" ")}`.toLowerCase();
      const desc = (d.description ?? "").toLowerCase();
      let score = 0;
      let hit = "";
      for (const w of words) {
        const s = name.includes(w) ? 3 : rest.includes(w) ? 2 : desc.includes(w) ? 1 : 0;
        if (s && !hit) hit = w;
        score += s;
      }
      // Familiepizza og menuer til flere passer bedre, når man er mange
      if (people > 2 && /famil|menu|stor|mix|deling/i.test(`${d.name} ${d.category}`)) score += 2;
      return { d, score: score + (d.open ? 0.5 : 0), hit };
    })
    .filter((s) => s.score >= 1 || (!words.size && maxPrice))
    .sort((a, b) => b.score - a.score || a.d.price - b.d.price);

  // Højst én ret pr. sted, så der er noget at vælge imellem
  const picks: Pick[] = [];
  const used = new Set<string>();
  for (const s of scored) {
    if (used.has(s.d.slug)) continue;
    used.add(s.d.slug);
    const why = s.hit ? `Passer til "${s.hit}"${maxPrice ? ` og koster under ${maxPrice} kr.` : "."}` : `Under ${maxPrice} kr.${s.d.open ? " Og de har åbent nu." : ""}`;
    picks.push(toPick(s.d, why));
    if (picks.length === 3) break;
  }
  return { intro: picks.length ? "Det her kunne være noget for dig:" : "Oraklet fandt ikke noget, der passer. Prøv at skrive det på en anden måde.", picks, ai: false };
}
