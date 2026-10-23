import { describe, expect, it } from "vitest";
import { badgeProgress, comeback, newBadges, streetName, type RememberedOrder } from "./badges";
import { wordConflict } from "./hensyn";
import { dishes, plainAnswer } from "./oracle";
import { countTags, plainVibe, tagsFor } from "./tags";
import type { Place } from "./types";

const DAY = 24 * 3600_000;
const order = (id: string, slug: string, daysAgo: number, dishes: string[], cuisines = ["Pizza"]): RememberedOrder => ({
  id,
  slug,
  placeName: slug === "p" ? "Prøvepizza" : "Grandt's Kaffebar",
  street: slug === "p" ? "Havnegade" : "Østergade",
  cuisines,
  dishes,
  at: new Date(Date.parse("2026-10-23T12:00:00Z") - daysAgo * DAY).toISOString(),
});

describe("mikro-tags", () => {
  it("giver ost til pizza og lyn-levering, når maden køres ud", () => {
    const ids = (o: Parameters<typeof tagsFor>[0], c: string[]) => tagsFor(o, c).map((t) => t.id);
    expect(ids({ lines: [{ itemId: "1", name: "Margherita", price: 80, quantity: 1 }] }, ["Pizza"])).toEqual(["cheese", "hot", "ontime", "service", "wait", "lukewarm"]);
    expect(ids({ lines: [{ itemId: "1", name: "Latte", price: 40, quantity: 1 }], delivery: { address: "x", postcode: "5610", fee: 30 } }, ["Café"])).toEqual(["tasty", "hot", "fast", "service", "wait", "lukewarm"]);
  });

  it("skriver stemningen uden AI og nævner kun ventetid, når hver femte siger det", () => {
    const rated = [{ tags: ["hot", "service"] }, { tags: ["hot"] }, { tags: ["service", "wait"] }, { tags: ["hot"] }, { tags: ["tasty"] }, { tags: ["hot"] }];
    const counts = countTags(rated);
    expect(counts[0]).toEqual({ tag: "hot", count: 4 });
    expect(plainVibe(counts, rated.length)).toBe("Kunderne roser især at maden er rygende varm og den søde betjening.");
    expect(plainVibe(countTags([...rated, { tags: ["wait"] }]), 7)).toBe("Kunderne roser især at maden er rygende varm og den søde betjening. Enkelte nævner lidt ventetid.");
  });
});

describe("allergidetektiven uden AI", () => {
  it("finder ost og kød, men ikke ord der bare ligner", () => {
    expect(wordConflict({ name: "Margherita", description: "Tomat og ost" }, ["laktose"])).toEqual({ hensyn: "laktose", word: "ost" });
    expect(wordConflict({ name: "Rostbøf-sandwich" }, ["laktose"])).toBeNull();
    expect(wordConflict({ name: "Pizza Hawaii", description: "Skinke og ananas" }, ["vegetar"])).toEqual({ hensyn: "vegetar", word: "skinke" });
    expect(wordConflict({ name: "Grøn salat" }, ["vegetar", "gluten"])).toBeNull();
  });
});

describe("Mester-Spiser", () => {
  it("giver Pizza-Prinsen ved tredje pizza og siger, at det er nyt", () => {
    const orders = [order("1", "p", 30, ["Margherita"]), order("2", "p", 20, ["Pepperoni"]), order("3", "p", 1, ["Margherita"])];
    expect(badgeProgress(orders, "Assens").find((b) => b.id === "pizza")).toMatchObject({ earned: true, name: "Pizza-Prinsen af {by}", vars: { by: "Assens" } });
    expect(newBadges(orders, "3", "Assens").map((b) => b.id)).toEqual(["pizza"]);
    expect(newBadges(orders.slice(0, 1), "1", "Assens").map((b) => b.id)).toEqual(["first"]);
  });

  it("siger hej til en fast kunde efter 3 uger med livretten", () => {
    const now = Date.parse("2026-10-23T12:00:00Z");
    const regular = [order("1", "k", 60, ["Latte"], ["Café"]), order("2", "k", 40, ["Latte", "Kage"], ["Café"]), order("3", "k", 25, ["Latte"], ["Café"])];
    expect(comeback(regular, () => true, now)).toEqual({ slug: "k", placeName: "Grandt's Kaffebar", street: "Østergade", dish: "Latte", days: 25 });
    expect(comeback(regular, () => false, now)).toBeNull();
    expect(comeback([...regular, order("4", "k", 5, ["Latte"])], () => true, now)).toBeNull();
    expect(streetName("Østergade 19, 5610 Assens")).toBe("Østergade");
  });
});

describe("Mad-oraklet uden AI", () => {
  const place = (slug: string, name: string, items: { id: string; name: string; price: number; description?: string }[]): Place =>
    ({ slug, name, member: true, cuisines: ["Pizza"], acceptsOrders: true, hours: [], menu: [{ name: "Menu", items }] }) as unknown as Place;
  const places = [
    place("a", "Pizza A", [{ id: "1", name: "Margherita", price: 79 }, { id: "2", name: "Familiepizza", price: 189 }]),
    place("b", "Burger B", [{ id: "3", name: "Cheeseburger", price: 95, description: "Med pommes" }]),
    { ...place("c", "Låst", [{ id: "4", name: "Burger", price: 50 }]), member: false },
  ];

  it("finder retter ud fra ord og pris og springer steder over, der ikke er med", () => {
    const all = dishes(places);
    expect(all.map((d) => d.itemId)).toEqual(["1", "2", "3"]);
    const answer = plainAnswer("Jeg vil have en burger under 100 kr.", all);
    expect(answer.picks.map((p) => p.itemId)).toEqual(["3"]);
    expect(answer.picks[0].why).toBe('Passer til "burger" og koster under 100 kr.');
    expect(plainAnswer("Tømmermænd, comfort food", all).picks.length).toBeGreaterThan(0);
    expect(plainAnswer("sushi", all).picks).toEqual([]);
    expect(dishes(places, new Date(), "b").map((d) => d.itemId)).toEqual(["3"]);
  });
});
