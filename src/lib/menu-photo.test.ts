import { describe, expect, it } from "vitest";
import { cleanRead, combineMenus } from "./menu-photo";

const cat = (name: string, items: [string, string][], sizes: unknown[] = []) => ({ name, sizes, extras: [] as unknown[], items: items.map(([id, n]) => ({ id, name: n })) });

describe("billede af menukortet", () => {
  it("rydder op i AI'ens svar og gætter ikke priser", () => {
    const answer = cleanRead({
      categories: [
        { name: " Pizza ", sizes: [{ name: "Alm.", extra: 5 }, { name: "Familie", extra: 95 }], extras: [{ name: "Ekstra ost", price: 10 }], items: [{ name: "1. Margherita", description: "Tomat, ost", price: 85.499 }, { name: "2. Hawaii", description: "", price: null }, { name: "", price: 3 }] },
        { name: "Tom", sizes: [], extras: [], items: [] },
        { name: "Drikke", sizes: [{ name: "0,5 l", extra: 0 }], extras: [], items: [{ name: "Cola", description: "", price: -4 }] },
      ],
      note: "Prisen på Hawaii var utydelig.",
    });
    expect(answer.categories).toHaveLength(2);
    const [pizza, drikke] = answer.categories;
    expect(pizza.name).toBe("Pizza");
    expect(pizza.items).toEqual([{ name: "1. Margherita", description: "Tomat, ost", price: 85.5 }, { name: "2. Hawaii", description: "", price: null }]);
    expect(pizza.sizes).toEqual([{ name: "Alm.", extra: 0 }, { name: "Familie", extra: 95 }]);
    expect(pizza.extras).toEqual([{ name: "Ekstra ost", price: 10 }]);
    expect(drikke.sizes).toEqual([]);
    expect(drikke.items[0].price).toBeNull();
    expect(answer.note).toBe("Prisen på Hawaii var utydelig.");
  });

  it("tåler et svar, der ikke ligner noget", () => {
    expect(cleanRead(null)).toEqual({ categories: [], note: "" });
    expect(cleanRead({ categories: "nej" }).categories).toEqual([]);
  });

  it("erstatter menukortet, men retter med samme navn beholder deres id", () => {
    const old = [cat("Pizza", [["a", "Margherita"], ["b", "Pepperoni"]])];
    const read = [cat("Pizzaer", [["x", "margherita "], ["y", "Hawaii"]])];
    const result = combineMenus(old, read, "replace");
    expect(result.map((c) => c.name)).toEqual(["Pizzaer"]);
    expect(result[0].items.map((i) => i.id)).toEqual(["a", "y"]);
  });

  it("lægger nye retter til uden at skrive de samme to gange", () => {
    const old = [cat("Pizza", [["a", "Margherita"]]), cat("", [["e", ""]])];
    const read = [cat("pizza", [["x", "Margherita"], ["y", "Hawaii"]], [{ name: "Alm." }, { name: "Familie" }]), cat("Drikke", [["z", "Cola"]])];
    const result = combineMenus(old, read, "add");
    expect(result.map((c) => c.name)).toEqual(["Pizza", "Drikke"]);
    expect(result[0].items.map((i) => i.id)).toEqual(["a", "y"]);
    expect(result[0].sizes).toHaveLength(2);
    expect(old[0].items).toHaveLength(1);
  });
});
