// ByNu er systemet bag. Hver by har sin egen side med byens navn forrest, fx AssensNu.
// Til en ny by sættes NEXT_PUBLIC_BY på Vercel, fx "Faaborg".
export const CITY = process.env.NEXT_PUBLIC_BY?.trim() || "Assens";
export const SITE = `${CITY}Nu`;
export const BRAND = "ByNu";
export const BRAND_DOMAIN = "bynu.dk";
