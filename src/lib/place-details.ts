import { cleanPhone, type Result } from "./orders";
import type { PlaceDetails } from "./store/types";
import type { DeliverySettings, MenuCategory, MenuOptions, OpeningPeriod, Weekday } from "./types";

// Det, restauranterne selv kan rette i panelet: telefon, åbningstider og menukort.
// Alt tjekkes her på serveren, så panelet ikke kan gemme noget, siden ikke kan vise.

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Raw = {
  phone?: unknown;
  hours?: { day?: unknown; open?: unknown; close?: unknown }[];
  menu?: {
    name?: unknown;
    items?: { id?: unknown; name?: unknown; description?: unknown; price?: unknown }[];
    options?: { sizes?: { name?: unknown; extra?: unknown }[]; extras?: { name?: unknown; price?: unknown }[] } | null;
  }[];
  delivery?: { fee?: unknown; minimum?: unknown; postcodes?: unknown; harbour?: unknown; camping?: unknown } | null;
};

const kroner = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10000 ? Math.round(v * 100) / 100 : null);

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function cleanDetails(input: unknown): Result<PlaceDetails> {
  if (!input || typeof input !== "object") return { ok: false, error: "Der var ikke noget at gemme." };
  const raw = input as Raw;
  const details: PlaceDetails = {};

  if (raw.phone !== undefined) {
    const phone = text(raw.phone);
    if (phone === "") details.phone = null;
    else {
      const clean = cleanPhone(phone);
      if (!clean) return { ok: false, error: "Telefonnummeret skal have 8 cifre." };
      details.phone = clean;
    }
  }

  if (raw.hours !== undefined) {
    if (!Array.isArray(raw.hours) || raw.hours.length > 21) return { ok: false, error: "Åbningstiderne kunne ikke læses." };
    const hours: OpeningPeriod[] = [];
    for (const h of raw.hours) {
      const day = h?.day;
      const open = text(h?.open);
      const close = text(h?.close);
      if (!Number.isInteger(day) || (day as number) < 0 || (day as number) > 6 || !TIME.test(open) || !TIME.test(close)) {
        return { ok: false, error: "Et af tidspunkterne er ikke et rigtigt klokkeslæt." };
      }
      if (open === close) return { ok: false, error: "En åbningstid starter og slutter på samme tid." };
      hours.push({ day: day as Weekday, open, close });
    }
    hours.sort((a, b) => a.day - b.day || a.open.localeCompare(b.open));
    details.hours = hours;
  }

  if (raw.menu !== undefined) {
    if (!Array.isArray(raw.menu) || raw.menu.length > 30) return { ok: false, error: "Menukortet kunne ikke læses." };
    const seen = new Set<string>();
    const menu: MenuCategory[] = [];
    let count = 0;
    for (const c of raw.menu) {
      const name = text(c?.name).slice(0, 60);
      const items = Array.isArray(c?.items) ? c.items : [];
      if (!name) return { ok: false, error: "Giv hver kategori et navn, fx Pizza eller Drikkevarer." };
      const options = cleanOptions(name, c?.options);
      if (!options.ok) return options;
      const category: MenuCategory = { name, items: [], ...(options.value && { options: options.value }) };
      for (const i of items) {
        const itemName = text(i?.name).slice(0, 80);
        const price = typeof i?.price === "number" ? Math.round(i.price * 100) / 100 : NaN;
        if (!itemName) return { ok: false, error: `En ret under ${name} mangler et navn.` };
        if (!Number.isFinite(price) || price < 0 || price > 10000) return { ok: false, error: `${itemName} mangler en pris.` };
        // Retter beholder deres id, så kurve og udsolgt-markeringer følger med
        let id = text(i?.id);
        if (!UUID.test(id) || seen.has(id)) id = crypto.randomUUID();
        seen.add(id);
        const description = text(i?.description).slice(0, 200);
        category.items.push({ id, name: itemName, price, ...(description && { description }) });
        if (++count > 300) return { ok: false, error: "Menukortet må højst have 300 retter." };
      }
      menu.push(category);
    }
    details.menu = menu;
  }

  if (raw.delivery !== undefined) {
    if (raw.delivery === null) details.delivery = null;
    else {
      const fee = kroner(raw.delivery?.fee);
      const minimum = kroner(raw.delivery?.minimum ?? 0);
      if (fee === null) return { ok: false, error: "Skriv hvad levering koster, fx 39. Skriv 0, hvis det er gratis." };
      if (minimum === null) return { ok: false, error: "Mindste beløb skal være et tal, fx 150." };
      const list = Array.isArray(raw.delivery?.postcodes) ? raw.delivery.postcodes : [];
      const postcodes = [...new Set(list.map((p) => text(p)))];
      const harbour = raw.delivery?.harbour === true;
      const camping = raw.delivery?.camping === true;
      if (postcodes.length === 0 && !harbour && !camping) return { ok: false, error: "Skriv mindst ét postnummer, I kører ud til, fx 5610." };
      if (postcodes.length > 40 || postcodes.some((p) => !/^\d{4}$/.test(p))) return { ok: false, error: "Et postnummer skal have 4 cifre, fx 5610." };
      details.delivery = { fee, minimum, postcodes: postcodes.sort(), ...(harbour && { harbour }), ...(camping && { camping }) } satisfies DeliverySettings;
    }
  }

  return { ok: true, value: details };
}

// Størrelser og tilvalg til en kategori. Tomme lister betyder, at retterne bare har én pris.
function cleanOptions(category: string, raw: NonNullable<Raw["menu"]>[number]["options"]): Result<MenuOptions | undefined> {
  if (!raw) return { ok: true, value: undefined };
  const sizes: MenuOptions["sizes"] = [];
  const extras: MenuOptions["extras"] = [];
  for (const s of Array.isArray(raw.sizes) ? raw.sizes.slice(0, 8) : []) {
    const name = text(s?.name).slice(0, 30);
    const extra = kroner(s?.extra ?? 0);
    if (!name) return { ok: false, error: `En størrelse under ${category} mangler et navn, fx Familie.` };
    if (extra === null) return { ok: false, error: `Skriv hvad ${name} koster ekstra under ${category}, fx 100. Skriv 0, hvis det er samme pris.` };
    if (sizes.some((x) => x.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: `${name} står to gange under ${category}.` };
    sizes.push({ name, extra });
  }
  for (const e of Array.isArray(raw.extras) ? raw.extras.slice(0, 80) : []) {
    const name = text(e?.name).slice(0, 40);
    const price = kroner(e?.price);
    if (!name) return { ok: false, error: `Et tilvalg under ${category} mangler et navn, fx Bacon.` };
    if (price === null) return { ok: false, error: `Skriv hvad ${name} koster under ${category}, fx 10.` };
    if (extras.some((x) => x.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: `${name} står to gange under ${category}.` };
    extras.push({ name, price });
  }
  if (sizes.length === 1) return { ok: false, error: `Skriv mindst to størrelser under ${category}, eller fjern den ene.` };
  return { ok: true, value: sizes.length || extras.length ? { sizes, extras } : undefined };
}
