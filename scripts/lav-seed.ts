// Laver supabase/seed.sql ud fra src/data/places.ts, så Supabase starter med de samme steder.
// Kør: node --experimental-strip-types scripts/lav-seed.ts
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { seedPlaces } from "../src/data/places.ts";

const q = (v: string | undefined | null) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const b = (v: boolean | null | undefined) => (v == null ? "null" : String(v));
const arr = (v: string[]) => `array[${v.map(q).join(", ")}]::text[]`;

const out = ["-- Lavet af scripts/lav-seed.ts. Kør efter 0001_init.sql.", "begin;"];

for (const p of seedPlaces) {
  const pin = p.demo ? q(createHash("sha256").update("1234").digest("hex")) : "null";
  out.push(
    `insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values (${[
      q(p.slug), q(p.name), arr(p.cuisines), q(p.address), q(p.phone), q(p.website), q(p.facebook), q(p.description),
      b(p.takeaway), b(p.dineIn), b(p.acceptsOrders), b(p.acceptsBookings), p.prepMinutes, pin,
    ].join(", ")});`,
  );
  for (const h of p.hours) out.push(`insert into opening_hours (place_slug, day, open, close) values (${q(p.slug)}, ${h.day}, '${h.open}', '${h.close}');`);
  p.menu.forEach((c, ci) => {
    out.push(`with c as (insert into menu_categories (place_slug, name, position) values (${q(p.slug)}, ${q(c.name)}, ${ci}) returning id)`);
    const rows = c.items.map((i, ii) => `((select id from c), ${q(i.name)}, ${q(i.description)}, ${i.price}, ${ii})`);
    out.push(`insert into menu_items (category_id, name, description, price_kr, position) values\n  ${rows.join(",\n  ")};`);
  });
}

out.push("commit;", "");
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out.join("\n"));
console.log(`${seedPlaces.length} steder skrevet til supabase/seed.sql`);
