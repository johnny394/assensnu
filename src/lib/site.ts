// ByNu er systemet bag. Hver by har sin egen side med byens navn forrest, fx AssensNu.
// Til en ny by sættes NEXT_PUBLIC_BY på Vercel, fx "Faaborg".
export const CITY = process.env.NEXT_PUBLIC_BY?.trim() || "Assens";
export const SITE = `${CITY}Nu`;
export const BRAND = "ByNu";
export const BRAND_DOMAIN = "bynu.dk";
// Testkopien (test.bynu.dk) sætter NEXT_PUBLIC_TESTUDGAVE=1 på Vercel. Så står der "Testudgave" øverst, og Google holdes ude.
export const TEST = process.env.NEXT_PUBLIC_TESTUDGAVE?.trim() === "1";

// Byernes egne sider. En lille by kan vise vej til en større nabo nederst på forsiden.
export const TOWN_SITES: Record<string, string> = {
  Assens: "https://assens.bynu.dk",
  Glamsbjerg: "https://glamsbjerg.bynu.dk",
};
const NEIGHBOURS: Record<string, string[]> = { Glamsbjerg: ["Assens"] };
export const NEARBY = (NEIGHBOURS[CITY] ?? []).filter((t) => TOWN_SITES[t]).map((name) => ({ name, url: TOWN_SITES[name] }));
