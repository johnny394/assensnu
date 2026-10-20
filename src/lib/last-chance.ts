import { copenhagenNow, openStatus } from "./hours";
import type { Result } from "./orders";
import type { LastChance, Place } from "./types";

// "Sidste chance": mad, der er tilbage sidst på dagen, til halv pris indtil lukketid,
// så den bliver spist i stedet for smidt ud.

export const lastChancePrice = (price: number) => Math.ceil(price / 2);

// Hvornår slutter det? Ved lukketid i dag. Kun mens stedet har åbent.
export function lastChanceEnd(place: Pick<Place, "hours" | "closedToday">, now = new Date()): Date | null {
  const status = openStatus(place, now);
  if (status.state !== "open") return null;
  const [h, m] = status.closesAt.split(":").map(Number);
  let minutes = h * 60 + m - copenhagenNow(now).minutes;
  if (minutes <= 0) minutes += 24 * 60; // lukker efter midnat
  return new Date(now.getTime() + minutes * 60_000);
}

// Det gemte: retterne og sluttidspunktet. Gælder kun, til tiden er gået.
export function activeLastChance(saved: { itemIds?: unknown; until?: unknown } | null | undefined, now = new Date()): LastChance | undefined {
  if (!saved || !Array.isArray(saved.itemIds) || typeof saved.until !== "string") return undefined;
  const until = new Date(saved.until);
  if (!(until.getTime() > now.getTime()) || saved.itemIds.length === 0) return undefined;
  return { itemIds: saved.itemIds.filter((i): i is string => typeof i === "string"), until: saved.until };
}

// Kun rigtige retter fra stedets eget menukort, ikke udsolgte
export function cleanLastChanceItems(place: Pick<Place, "menu">, itemIds: unknown): Result<string[]> {
  if (!Array.isArray(itemIds) || itemIds.length === 0) return { ok: false, error: "Vælg de retter, I har tilbage." };
  const known = new Map(place.menu.flatMap((c) => c.items).map((i) => [i.id, i]));
  const ids = [...new Set(itemIds.map(String))];
  for (const id of ids) {
    const item = known.get(id);
    if (!item) return { ok: false, error: "En af retterne findes ikke længere. Prøv igen." };
    if (item.soldOut) return { ok: false, error: `${item.name} er markeret som udsolgt.` };
  }
  return { ok: true, value: ids.slice(0, 60) };
}
