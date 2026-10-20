import { describe, expect, it } from "vitest";
import { demoPlace } from "@/data/places";
import { cleanGroupItems, cleanGroupName, groupIsOpen, groupOrderItems, groupView } from "./groups";
import { buildOrder } from "./orders";
import type { GroupOrder } from "./types";

const friday = new Date("2026-10-16T15:30:00Z"); // 17:30 i Assens
const group: GroupOrder = {
  id: "g1",
  placeSlug: demoPlace.slug,
  hostName: "Johnny",
  createdAt: "2026-10-16T09:00:00Z",
  entries: [
    { id: "e1", name: "Johnny", items: [{ itemId: "d1", quantity: 2 }], createdAt: "2026-10-16T09:01:00Z" },
    { id: "e2", name: "Mette", items: [{ itemId: "d5", quantity: 1 }], createdAt: "2026-10-16T09:02:00Z" },
  ],
};

describe("fællesbestilling", () => {
  it("viser hver persons mad og prisen i alt", () => {
    const view = groupView(demoPlace, group, friday);
    expect(view.entries.map((e) => [e.name, e.total])).toEqual([
      ["Johnny", 150],
      ["Mette", 70],
    ]);
    expect(view.total).toBe(220);
    expect(view.open).toBe(true);
  });

  it("bliver til én ordre med navn på hver ret", () => {
    const r = buildOrder(demoPlace, { items: groupOrderItems(group), name: "Johnny", phone: "12345678", pickup: "asap" }, friday);
    expect(r.ok && r.value.total).toBe(220);
    expect(r.ok && r.value.lines.map((l) => l.person)).toEqual(["Johnny", "Mette"]);
  });

  it("lukker, når den er sendt, eller dagen er gået", () => {
    expect(groupIsOpen({ ...group, orderId: "o1" }, friday)).toBe(false);
    expect(groupIsOpen(group, new Date("2026-10-17T09:00:00Z"))).toBe(false);
  });

  it("tjekker navn og mad", () => {
    expect(cleanGroupName("  Mette  ")).toBe("Mette");
    expect(cleanGroupName("   ")).toBeNull();
    expect(cleanGroupItems(demoPlace, []).ok).toBe(false);
    expect(cleanGroupItems(demoPlace, [{ itemId: "findes-ikke", quantity: 1 }]).ok).toBe(false);
    expect(cleanGroupItems(demoPlace, [{ itemId: "d1", quantity: 0 }]).ok).toBe(false);
    expect(cleanGroupItems(demoPlace, [{ itemId: "d1", quantity: 1, size: "Familie" }])).toEqual({ ok: true, value: [{ itemId: "d1", quantity: 1, size: "Familie", extras: undefined }] });
  });
});
