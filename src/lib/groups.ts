import { todayInCopenhagen } from "./hours";
import { priceChoice } from "./menu-options";
import type { Result } from "./orders";
import type { CartItem, GroupOrder, OrderLine, Place } from "./types";

export const GROUP_MAX_PEOPLE = 30;
const NAME_MAX = 40;

export function cleanGroupName(name: unknown): string | null {
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX) : "";
  return clean || null;
}

// Tjekker én persons mad mod menuen. Prisen regnes først ud, når ordren sendes.
export function cleanGroupItems(place: Place, items: unknown): Result<CartItem[]> {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "Læg noget mad i kurven først." };
  const clean: CartItem[] = [];
  for (const raw of items.slice(0, 20)) {
    const item: CartItem = {
      itemId: String(raw?.itemId ?? ""),
      quantity: raw?.quantity,
      size: typeof raw?.size === "string" ? raw.size : undefined,
      extras: Array.isArray(raw?.extras) ? raw.extras.filter((e: unknown) => typeof e === "string") : undefined,
    };
    const priced = priceChoice(place, item);
    if (!priced.ok) return priced;
    if (priced.value.item.soldOut) return { ok: false, error: `${priced.value.item.name} er desværre udsolgt.` };
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return { ok: false, error: "Antal skal være mellem 1 og 20." };
    clean.push(item);
  }
  return { ok: true, value: clean };
}

// Kan man stadig lægge mad i? Kun samme dag, og kun indtil den er sendt.
export function groupIsOpen(group: Pick<GroupOrder, "orderId" | "createdAt">, now = new Date()): boolean {
  return !group.orderId && todayInCopenhagen(new Date(group.createdAt)) === todayInCopenhagen(now);
}

// Alle personers mad som ordrelinjer med navn på. Retter, der er slettet fra menuen siden, springes over.
export function groupLines(place: Place, group: GroupOrder): OrderLine[] {
  return group.entries.flatMap((entry) =>
    entry.items.flatMap((item) => {
      const priced = priceChoice(place, item);
      if (!priced.ok) return [];
      const { item: _item, ...line } = priced.value; // eslint-disable-line @typescript-eslint/no-unused-vars
      return [{ ...line, quantity: item.quantity, person: entry.name }];
    }),
  );
}

// Det, der sendes med, når ordren laves: alle retter med navn på
export function groupOrderItems(group: GroupOrder) {
  return group.entries.flatMap((e) => e.items.map((i) => ({ ...i, person: e.name })));
}

export type GroupView = {
  id: string;
  placeSlug: string;
  placeName: string;
  hostName: string;
  orderId: string | null;
  open: boolean;
  entries: { id: string; name: string; lines: OrderLine[]; total: number }[];
  total: number;
};

// Det, siden med fællesbestillingen viser: hver persons mad med priser fra menuen lige nu
export function groupView(place: Place, group: GroupOrder, now = new Date()): GroupView {
  const entries = group.entries.map((e) => {
    const lines = groupLines(place, { ...group, entries: [e] });
    return { id: e.id, name: e.name, lines, total: lines.reduce((sum, l) => sum + l.price * l.quantity, 0) };
  });
  return {
    id: group.id,
    placeSlug: place.slug,
    placeName: place.name,
    hostName: group.hostName,
    orderId: group.orderId ?? null,
    open: groupIsOpen(group, now),
    entries,
    total: entries.reduce((sum, e) => sum + e.total, 0),
  };
}
