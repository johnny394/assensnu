// Kundens hensyn (laktosefri, vegetar ...), gemt på telefonen. Allergidetektiven ser på rettens navn
// og beskrivelse og siger til, hvis den ser ud til at indeholde noget, kunden helst vil undgå.
// Det er altid et gæt ud fra menuteksten. Restauranten ved det sikkert.

export type HensynId = "laktose" | "gluten" | "vegetar" | "vegan" | "noedder" | "skaldyr" | "lavkarbo";

export const HENSYN: { id: HensynId; label: string }[] = [
  { id: "laktose", label: "Laktosefri" },
  { id: "gluten", label: "Glutenfri" },
  { id: "vegetar", label: "Vegetar" },
  { id: "vegan", label: "Vegansk" },
  { id: "noedder", label: "Ingen nødder" },
  { id: "skaldyr", label: "Ingen skaldyr" },
  { id: "lavkarbo", label: "Lav-karbo" },
];

export const isHensynId = (v: unknown): v is HensynId => typeof v === "string" && HENSYN.some((h) => h.id === v);

const MEAT = ["kylling", "oksekød", "okse", "svin", "flæsk", "bacon", "skinke", "pepperoni", "salami", "kebab", "shawarma", "gyros", "kød", "bøf", "burger", "frikadelle", "pølse", "lam", "kalv", "chorizo", "serrano", "parma", "laks", "tun", "rejer", "fisk", "ansjos"];
const DAIRY = ["ost", "mozzarella", "parmesan", "cheddar", "feta", "fløde", "smør", "mælk", "yoghurt", "creme", "cream", "bearnaise", "mayo", "dressing", "latte", "cappuccino", "kakao"];

// Ord i menuteksten, der tyder på noget, kunden vil undgå
const WORDS: Record<HensynId, string[]> = {
  laktose: DAIRY,
  gluten: ["pizza", "pasta", "brød", "bolle", "burger", "sandwich", "wrap", "durum", "pita", "hvede", "rasp", "paneret", "nuggets", "lasagne", "spaghetti", "tortilla", "kage", "tærte", "øl"],
  vegetar: MEAT,
  vegan: [...MEAT, ...DAIRY, "æg", "honning"],
  noedder: ["nød", "nødder", "mandel", "mandler", "peanut", "jordnød", "cashew", "hasselnød", "valnød", "pistacie", "pesto", "satay", "marcipan", "nougat", "nutella"],
  skaldyr: ["reje", "rejer", "krabbe", "hummer", "musling", "skaldyr", "scampi", "blæksprutte", "calamari", "jomfruhummer"],
  lavkarbo: ["pizza", "pasta", "brød", "pommes", "fritter", "ris", "kartof", "nudler", "burger", "durum", "wrap", "pita", "kage", "sodavand", "cola"],
};

export type Conflict = { hensyn: HensynId; word: string };

/** Uden AI: første ord i navn eller beskrivelse, der rammer et af kundens hensyn */
export function wordConflict(item: { name: string; description?: string }, hensyn: HensynId[]): Conflict | null {
  const text = ` ${item.name} ${item.description ?? ""} `.toLowerCase();
  for (const h of hensyn) {
    for (const word of WORDS[h]) {
      // "ost" må ikke ramme "rosted" eller "kost": ordet skal stå for sig selv eller i starten af et ord
      const re = new RegExp(`(^|[^a-zæøå])${word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      if (re.test(text)) return { hensyn: h, word: word.trim() };
    }
  }
  return null;
}

