import { createHash, randomInt } from "node:crypto";
import { cleanPhone, type Result } from "./orders";
import type { PlanId } from "./plans";
import type { DeliverySettings, MenuCategory, OpeningPeriod } from "./types";

// Det, Johnny ser og retter i sit eget panel
export type AdminPlace = {
  slug: string;
  name: string;
  address: string;
  cuisines: string[];
  phone?: string;
  takeaway: boolean | null;
  dineIn: boolean | null;
  published: boolean;
  acceptsOrders: boolean;
  acceptsBookings: boolean;
  hasCode: boolean;
  hours: OpeningPeriod[];
  menu: MenuCategory[];
  delivery: DeliverySettings | null;
  subscription?: string; // Stripes status for abonnementet, fx "active"
  plan?: PlanId; // den pakke, stedet har valgt
};

export type PlaceBasics = {
  name: string;
  address: string;
  cuisines: string[];
  phone: string | null;
  takeaway: boolean | null;
  dineIn: boolean | null;
};

export type AdminPatch = Partial<PlaceBasics> & {
  published?: boolean;
  acceptsOrders?: boolean;
  acceptsBookings?: boolean;
  pinHash?: string;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const yesNo = (v: unknown) => (v === true || v === false ? v : null);

export function cleanBasics(input: unknown): Result<PlaceBasics> {
  const raw = (input ?? {}) as Record<string, unknown>;
  const name = text(raw.name, 80);
  if (!name) return { ok: false, error: "Skriv stedets navn." };
  const address = text(raw.address, 120);
  if (!address) return { ok: false, error: "Skriv adressen, fx Østergade 12, 5610 Assens." };
  const cuisines = (typeof raw.cuisines === "string" ? raw.cuisines.split(",") : Array.isArray(raw.cuisines) ? raw.cuisines : [])
    .map((c) => text(c, 30))
    .filter(Boolean)
    .map((c) => c[0].toUpperCase() + c.slice(1))
    .slice(0, 6);
  const phoneText = text(raw.phone, 20);
  const phone = phoneText ? cleanPhone(phoneText) : null;
  if (phoneText && !phone) return { ok: false, error: "Telefonnummeret skal have 8 cifre." };
  return { ok: true, value: { name, address, cuisines, phone, takeaway: yesNo(raw.takeaway), dineIn: yesNo(raw.dineIn) } };
}

// "Café Banken" bliver til "cafe-banken", som bruges i adressen /sted/cafe-banken
export function makeSlug(name: string, taken: string[]) {
  const base =
    name
      .toLowerCase()
      .replace(/æ/g, "ae")
      .replace(/ø/g, "oe")
      .replace(/å/g, "aa")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "sted";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}

// En kode på 4 cifre, der ikke er let at gætte
export function newPin() {
  for (;;) {
    const pin = String(randomInt(0, 10000)).padStart(4, "0");
    const easy = /^(\d)\1{3}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin) || /^(19|20)\d\d$/.test(pin);
    if (!easy) return pin;
  }
}

export const hashPin = (pin: string) => createHash("sha256").update(pin).digest("hex");
