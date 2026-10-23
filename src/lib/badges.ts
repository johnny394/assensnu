// "Mester-Spiser": mærker for det, man bestiller, og en venlig hilsen, når det er længe siden.
// Det hele regnes ud på kundens egen telefon ud fra de bestillinger, telefonen husker. Intet sendes til os.

export type RememberedOrder = {
  id: string;
  slug: string;
  placeName: string;
  street: string; // fx "Østergade"
  cuisines: string[];
  dishes: string[]; // de danske navne
  at: string; // ISO
  offer?: boolean; // dagens tilbud var med
};

export type BadgeId = "first" | "pizza" | "burger" | "sushi" | "coffee" | "regular" | "explorer" | "night" | "offer";
// name og text kan have {by} og {sted}, som fyldes ud med vars, så de også kan oversættes
export type Badge = { id: BadgeId; emoji: string; name: string; text: string; vars: Record<string, string> };
export type BadgeProgress = Badge & { have: number; need: number; earned: boolean };

const has = (o: RememberedOrder, re: RegExp) => o.cuisines.some((c) => re.test(c)) || o.dishes.some((d) => re.test(d));
const hour = (iso: string) => Number(new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));

/** Alle mærker med hvor langt kunden er, så telefonen kan vise "2 af 3" */
export function badgeProgress(orders: RememberedOrder[], city: string): BadgeProgress[] {
  const bySlug = new Map<string, RememberedOrder[]>();
  for (const o of orders) bySlug.set(o.slug, [...(bySlug.get(o.slug) ?? []), o]);
  const favourite = [...bySlug.values()].sort((a, b) => b.length - a.length)[0];
  const count = (re: RegExp) => orders.filter((o) => has(o, re)).length;

  const vars = { by: city, sted: favourite?.[0].placeName ?? "" };
  const list: (Omit<Badge, "vars"> & { have: number; need: number })[] = [
    { id: "first", emoji: "🥇", name: "Første bid", text: "Din første bestilling hos et sted i {by}.", have: orders.length, need: 1 },
    { id: "pizza", emoji: "🍕", name: "Pizza-Prinsen af {by}", text: "Tre gange pizza. Du ved, hvad du kan lide.", have: count(/pizza/i), need: 3 },
    { id: "burger", emoji: "🍔", name: "Burger-Baronen", text: "Tre gange burger.", have: count(/burger/i), need: 3 },
    { id: "sushi", emoji: "🍣", name: "Sushi-Samuraien", text: "Tre gange sushi.", have: count(/sushi/i), need: 3 },
    { id: "coffee", emoji: "☕", name: "Kaffenyderen", text: "Tre gange kaffe eller kage fra byens caféer.", have: count(/caf[eé]|kaffe|latte|cappuccino|espresso|kage/i), need: 3 },
    { id: "regular", emoji: "🏠", name: favourite ? "Stamgæst hos {sted}" : "Stamgæsten", text: "Fire bestillinger samme sted. De kender dig nok nu.", have: favourite?.length ?? 0, need: 4 },
    { id: "explorer", emoji: "🧭", name: "Byens smagsdommer", text: "Du har prøvet fire forskellige steder i {by}.", have: bySlug.size, need: 4 },
    { id: "night", emoji: "🌙", name: "Natteravnen", text: "Tre bestillinger efter klokken 21.", have: orders.filter((o) => { const h = hour(o.at); return h >= 21 || h < 4; }).length, need: 3 },
    { id: "offer", emoji: "🏷️", name: "Tilbudsjægeren", text: "Tre gange dagens tilbud.", have: orders.filter((o) => o.offer).length, need: 3 },
  ];
  return list.map((b) => ({ ...b, vars, have: Math.min(b.have, b.need), earned: b.have >= b.need }));
}

export const earnedBadges = (orders: RememberedOrder[], city: string) => badgeProgress(orders, city).filter((b) => b.earned);

/** De mærker, den nyeste bestilling gav: dem, der ikke var der uden den */
export function newBadges(orders: RememberedOrder[], latestId: string, city: string): Badge[] {
  const before = new Set(earnedBadges(orders.filter((o) => o.id !== latestId), city).map((b) => b.id));
  return earnedBadges(orders, city).filter((b) => !before.has(b.id));
}

export const COMEBACK_DAYS = 21;
const DAY = 24 * 3600_000;

export type Comeback = { slug: string; placeName: string; street: string; dish: string; days: number };

/** Et sted, kunden plejer at bestille fra (mindst 3 gange), men ikke har bestilt fra i 3 uger. Det, der er længst siden, først. */
export function comeback(orders: RememberedOrder[], open: (slug: string) => boolean, now = Date.now()): Comeback | null {
  const bySlug = new Map<string, RememberedOrder[]>();
  for (const o of orders) bySlug.set(o.slug, [...(bySlug.get(o.slug) ?? []), o]);
  const lastTime = (list: RememberedOrder[]) => Math.max(...list.map((o) => Date.parse(o.at)));
  const regular = [...bySlug.values()]
    .filter((list) => list.length >= 3 && now - lastTime(list) >= COMEBACK_DAYS * DAY && open(list[0].slug))
    .sort((a, b) => lastTime(a) - lastTime(b))[0];
  if (!regular) return null;
  const latest = [...regular].sort((a, b) => b.at.localeCompare(a.at))[0];
  return { slug: latest.slug, placeName: latest.placeName, street: latest.street, dish: favouriteDish(regular), days: Math.floor((now - lastTime(regular)) / DAY) };
}

/** Den ret, kunden har bestilt flest gange hos stedet */
export function favouriteDish(orders: RememberedOrder[]): string {
  const counts = new Map<string, number>();
  for (const o of orders) for (const d of o.dishes) counts.set(d, (counts.get(d) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

/** Hilsenen uden AI. {ret} er livretten, {sted} gaden eller stedets navn. */
export const COMEBACK = "Hey! Det er længe siden, du har fået {ret} fra {sted}. Skal vi smide en i kurven?";

/** "Østergade 19, 5610 Assens" bliver til "Østergade" */
export const streetName = (address: string) => address.split(",")[0].replace(/\s+\d+\w*$/, "").trim();
