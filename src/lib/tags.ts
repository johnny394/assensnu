import type { Order } from "./types";

// Mikro-tags i stedet for 1-5 stjerner. Kunden trykker på det, der passer, når maden er hentet eller leveret.
export type TagId = "hot" | "fast" | "ontime" | "service" | "cheese" | "tasty" | "wait" | "lukewarm";
export type Tag = { id: TagId; emoji: string; label: string; good: boolean };

export const TAGS: Record<TagId, Tag> = {
  hot: { id: "hot", emoji: "🔥", label: "Rygende varm", good: true },
  fast: { id: "fast", emoji: "🚲", label: "Lyn-levering", good: true },
  ontime: { id: "ontime", emoji: "⏱️", label: "Klar til tiden", good: true },
  service: { id: "service", emoji: "💬", label: "Super betjening", good: true },
  cheese: { id: "cheese", emoji: "🧀", label: "Ekstra god ost", good: true },
  tasty: { id: "tasty", emoji: "😋", label: "Mega lækkert", good: true },
  wait: { id: "wait", emoji: "⏳", label: "Lidt ventetid", good: false },
  lukewarm: { id: "lukewarm", emoji: "🧊", label: "Maden var lunken", good: false },
};

export const isTagId = (v: unknown): v is TagId => typeof v === "string" && v in TAGS;
export const MAX_TAGS = 3;

const isPizza = (order: Pick<Order, "lines">, cuisines: string[]) =>
  cuisines.some((c) => /pizza/i.test(c)) || order.lines.some((l) => /pizza/i.test(l.name));

/** De tags, der passer til netop denne ordre: 4 gode og 2 til forbedring */
export function tagsFor(order: Pick<Order, "lines" | "delivery">, cuisines: string[]): Tag[] {
  const ids: TagId[] = [
    isPizza(order, cuisines) ? "cheese" : "tasty",
    "hot",
    order.delivery ? "fast" : "ontime",
    "service",
    "wait",
    "lukewarm",
  ];
  return ids.map((id) => TAGS[id]);
}

/** Pizza-emojien til "Rygende varm" på pizzasteder */
export const tagEmoji = (tag: Tag, pizza: boolean) => (tag.id === "hot" && pizza ? "🍕" : tag.emoji);
export const pizzaPlace = isPizza;

export type TagCount = { tag: TagId; count: number };

/** Tæller tags fra de seneste bedømmelser, flest først */
export function countTags(rated: { tags: string[] }[]): TagCount[] {
  const counts = new Map<TagId, number>();
  for (const r of rated) for (const t of r.tags) if (isTagId(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

// Så mange bedømmelser skal der til, før der står noget om stemningen
export const VIBE_MIN = 3;
export const VIBE_DAYS = 60;

const PRAISE: Partial<Record<TagId, string>> = {
  hot: "at maden er rygende varm",
  fast: "den hurtige levering",
  ontime: "at maden er klar til tiden",
  service: "den søde betjening",
  cheese: "den gode ost",
  tasty: "at det smager godt",
};

/** Stemningen uden AI: de to mest roste ting, og ventetid eller lunken mad, hvis mindst hver femte nævner det */
export function plainVibe(counts: TagCount[], rated: number): string {
  const good = counts.filter((c) => TAGS[c.tag].good).slice(0, 2).map((c) => PRAISE[c.tag]!);
  const first = good.length ? `Kunderne roser især ${good.join(" og ")}.` : "Kunderne har givet deres mening til kende.";
  const notes = counts.filter((c) => !TAGS[c.tag].good && c.count * 5 >= rated).map((c) => (c.tag === "wait" ? "lidt ventetid" : "at maden kan være lunken"));
  return notes.length ? `${first} Enkelte nævner ${notes.join(" og ")}.` : first;
}
