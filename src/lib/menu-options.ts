import type { Result } from "./orders";
import type { MenuCategory, MenuItem, MenuOptions, OrderLine, Place } from "./types";

// En linje i kurven: en ret, evt. med størrelse og tilvalg
export type Choice = { itemId: string; size?: string; extras?: string[] };

export const hasOptions = (o?: MenuOptions) => Boolean(o && (o.sizes.length > 1 || o.extras.length));

// Kurven gemmer hver linje under en nøgle. Retter uden valg bruger bare deres id,
// så kurve fra før størrelser og tilvalg fandtes, stadig virker.
export function choiceKey(c: Choice): string {
  const extras = [...(c.extras ?? [])].sort();
  return c.size || extras.length ? JSON.stringify([c.itemId, c.size ?? "", extras]) : c.itemId;
}

export function parseKey(key: string): Choice {
  if (!key.startsWith("[")) return { itemId: key };
  try {
    const [itemId, size, extras] = JSON.parse(key) as [string, string, string[]];
    return { itemId, ...(size && { size }), ...(extras?.length && { extras }) };
  } catch {
    return { itemId: "" };
  }
}

// Finder retten og regner prisen ud. Bruges både i kurven og på serveren, så prisen altid passer.
export function priceChoice(place: Place, c: Choice): Result<Omit<OrderLine, "quantity"> & { item: MenuItem }> {
  let found: { item: MenuItem; category: MenuCategory } | undefined;
  for (const category of place.menu) {
    const item = category.items.find((i) => i.id === c.itemId);
    if (item) found = { item, category };
  }
  if (!found) return { ok: false, error: "En af retterne findes ikke længere. Gå tilbage og prøv igen." };
  const { item, category } = found;
  const sizes = category.options?.sizes ?? [];
  const extras = category.options?.extras ?? [];
  let price = item.price;

  let size: string | undefined;
  if (sizes.length > 1) {
    const chosen = c.size ? sizes.find((s) => s.name === c.size) : sizes[0];
    if (!chosen) return { ok: false, error: `Størrelsen på ${item.name} findes ikke længere. Vælg den igen.` };
    size = chosen.name;
    price += chosen.extra;
  } else if (c.size) return { ok: false, error: `${item.name} kan ikke fås i flere størrelser længere.` };

  const picked = [...new Set(c.extras ?? [])];
  for (const name of picked) {
    const extra = extras.find((e) => e.name === name);
    if (!extra) return { ok: false, error: `Tilvalget ${name} til ${item.name} findes ikke længere.` };
    price += extra.price;
  }

  return { ok: true, value: { item, itemId: item.id, name: item.name, price, ...(size && { size }), ...(picked.length && { extras: picked }) } };
}

// "Fam. + bacon, feta" til køkkenet og kunden
export function choiceText(l: Pick<OrderLine, "size" | "extras">): string {
  const extras = l.extras?.length ? `+ ${l.extras.map((e) => e.toLowerCase()).join(", ")}` : "";
  return [l.size, extras].filter(Boolean).join(" ");
}
