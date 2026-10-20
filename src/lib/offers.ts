import { openStatus } from "./hours";
import type { Place } from "./types";

// Så mange tilbud står på forsiden. Resten ligger i tilbudsavisen på /tilbud.
export const FRONT_PAGE_OFFERS = 5;

// Blander med et tal mellem 0 og 1, så rækkefølgen er den samme, så længe man er på siden,
// men skifter fra besøg til besøg. Så får alle steder en fair chance for at stå forrest.
function shuffle<T>(list: T[], seed: number): T[] {
  let s = Math.floor(seed * 2 ** 31) || 1;
  const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Dagens tilbud i den rækkefølge, kunden ser dem: åbne steder før lukkede,
// kundens egne favoritter først, og ellers blandet.
export function rankOffers(places: Place[], { now, favorites, seed }: { now: Date; favorites: string[]; seed: number }) {
  const offers = shuffle(
    places.filter((p) => p.member && p.news),
    seed,
  ).map((place) => ({ place, open: openStatus(place, now).state === "open", favorite: favorites.includes(place.slug) }));
  return offers.sort((a, b) => Number(b.open) - Number(a.open) || Number(b.favorite) - Number(a.favorite));
}
