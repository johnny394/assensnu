import { describe, expect, it, vi } from "vitest";

// En lille falsk database: husker hvilke filtre der blev brugt, og kan lade som om kolonnen town mangler
let hasTown = true;
const calls: { table: string; filters: [string, unknown][]; insert?: unknown }[] = [];
const rows = [
  { slug: "a", name: "A", cuisines: [], address: "", accepts_orders: false, accepts_bookings: false, prep_minutes: 20, extra_wait_minutes: 0, closed_on: null, panel_pin_hash: null, opening_hours: [], menu_categories: [] },
];

function builder(table: string) {
  const call: (typeof calls)[number] = { table, filters: [] };
  calls.push(call);
  const result = () => {
    const usesTown = call.filters.some(([c]) => c === "town") || (call.insert && "town" in (call.insert as object));
    if (usesTown && !hasTown) return { data: null, error: { message: `column ${table}.town does not exist` } };
    if (call.insert) return { data: { id: "1", title: "t", date: "2026-10-21", time: "20:00", venue: "v" }, error: null };
    return { data: table === "events" ? [] : rows, error: null };
  };
  const b: Record<string, unknown> = {
    select: () => b,
    eq: (c: string, v: unknown) => (call.filters.push([c, v]), b),
    gte: () => b,
    order: () => b,
    single: () => b,
    insert: (r: unknown) => ((call.insert = r), b),
    then: (ok: (r: unknown) => unknown) => Promise.resolve(result()).then(ok),
  };
  return b;
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: builder }) }));

describe("flere byer", () => {
  it("viser kun byens egne steder", async () => {
    const { supabaseStore } = await import("./supabase");
    calls.length = 0;
    hasTown = true;
    await supabaseStore("u", "k").getPlaces();
    expect(calls.at(-1)!.filters).toContainEqual(["town", "Assens"]);
  });

  it("virker som før, indtil tilfoej-byer.sql er kørt", async () => {
    const { supabaseStore } = await import("./supabase");
    calls.length = 0;
    hasTown = false;
    const places = await supabaseStore("u", "k").getPlaces();
    expect(places.map((p) => p.slug)).toEqual(["a"]);
    expect(calls.at(-1)!.filters.some(([c]) => c === "town")).toBe(false);
    await supabaseStore("u", "k").createPlace("b", { name: "B", address: "x", cuisines: [], phone: null, takeaway: null, dineIn: null });
    expect(calls.at(-1)!.insert).not.toHaveProperty("town");
  });

  it("nye steder og events kommer i byen", async () => {
    const { supabaseStore } = await import("./supabase");
    calls.length = 0;
    hasTown = true;
    await supabaseStore("u", "k").createPlace("b", { name: "B", address: "x", cuisines: [], phone: null, takeaway: null, dineIn: null });
    expect(calls.at(-1)!.insert).toMatchObject({ slug: "b", town: "Assens" });
    await supabaseStore("u", "k").saveEvent({ title: "t", date: "2026-10-21", time: "20:00", venue: "v" });
    expect(calls.at(-1)!.insert).toMatchObject({ town: "Assens" });
  });
});
