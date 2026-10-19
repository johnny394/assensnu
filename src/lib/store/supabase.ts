import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { todayInCopenhagen } from "../hours";
import type { Booking, Order, Place, Weekday } from "../types";
import type { Store } from "./types";

type PlaceRow = {
  slug: string;
  name: string;
  cuisines: string[];
  address: string;
  phone: string | null;
  website: string | null;
  facebook: string | null;
  description: string | null;
  takeaway: boolean | null;
  dine_in: boolean | null;
  accepts_orders: boolean;
  accepts_bookings: boolean;
  prep_minutes: number;
  extra_wait_minutes: number;
  closed_on: string | null;
  opening_hours: { day: number; open: string; close: string }[];
  menu_categories: {
    name: string;
    position: number;
    menu_items: { id: string; name: string; description: string | null; price_kr: number; sold_out: boolean; position: number }[];
  }[];
};

const PLACE_SELECT = `slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in,
  accepts_orders, accepts_bookings, prep_minutes, extra_wait_minutes, closed_on,
  opening_hours (day, open, close),
  menu_categories (name, position, menu_items (id, name, description, price_kr, sold_out, position))`;

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function toPlace(r: PlaceRow): Place {
  return {
    slug: r.slug,
    name: r.name,
    cuisines: r.cuisines,
    address: r.address,
    phone: r.phone ?? undefined,
    website: r.website ?? undefined,
    facebook: r.facebook ?? undefined,
    description: r.description ?? undefined,
    takeaway: r.takeaway,
    dineIn: r.dine_in,
    acceptsOrders: r.accepts_orders,
    acceptsBookings: r.accepts_bookings,
    prepMinutes: r.prep_minutes,
    extraWaitMinutes: r.extra_wait_minutes,
    closedToday: r.closed_on === todayInCopenhagen(),
    demo: r.slug === "proevepizza" || undefined,
    hours: r.opening_hours.map((h) => ({ day: h.day as Weekday, open: h.open.slice(0, 5), close: h.close.slice(0, 5) })),
    menu: [...r.menu_categories].sort(byPosition).map((c) => ({
      name: c.name,
      items: [...c.menu_items].sort(byPosition).map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description ?? undefined,
        price: Number(i.price_kr),
        soldOut: i.sold_out,
      })),
    })),
  };
}

type OrderRow = {
  id: string;
  number: number;
  place_slug: string;
  place_name: string;
  customer_name: string;
  customer_phone: string;
  pickup: string;
  note: string | null;
  lines: Order["lines"];
  total_kr: number;
  status: Order["status"];
  ready_at: string | null;
  created_at: string;
};

const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  number: r.number,
  placeSlug: r.place_slug,
  placeName: r.place_name,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  pickup: r.pickup,
  note: r.note ?? undefined,
  lines: r.lines,
  total: Number(r.total_kr),
  status: r.status,
  readyAt: r.ready_at ?? undefined,
  createdAt: r.created_at,
});

type BookingRow = {
  id: string;
  place_slug: string;
  place_name: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  time: string;
  guests: number;
  note: string | null;
  status: Booking["status"];
  suggested_time: string | null;
  created_at: string;
};

const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  placeSlug: r.place_slug,
  placeName: r.place_name,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  date: r.date,
  time: r.time,
  guests: r.guests,
  note: r.note ?? undefined,
  status: r.status,
  suggestedTime: r.suggested_time ?? undefined,
  createdAt: r.created_at,
});

export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function supabaseStore(url: string, serviceKey: string): Store {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const check = <T>({ data, error }: { data: T; error: unknown }) => {
    if (error) throw error;
    return data;
  };

  return {
    async getPlaces() {
      const rows = check(await db.from("places").select(PLACE_SELECT).eq("published", true).order("name"));
      return (rows as unknown as PlaceRow[]).map(toPlace);
    },
    async getPlace(slug) {
      const row = check(await db.from("places").select(PLACE_SELECT).eq("slug", slug).maybeSingle());
      return row ? toPlace(row as unknown as PlaceRow) : null;
    },
    async updatePlaceSettings(slug, s) {
      const patch: Record<string, unknown> = {};
      if (s.acceptsOrders !== undefined) patch.accepts_orders = s.acceptsOrders;
      if (s.extraWaitMinutes !== undefined) patch.extra_wait_minutes = s.extraWaitMinutes;
      if (s.closedToday !== undefined) patch.closed_on = s.closedToday ? todayInCopenhagen() : null;
      if (Object.keys(patch).length) check(await db.from("places").update(patch).eq("slug", slug));
      if (s.soldOut) {
        // Sørg for at varen hører til netop dette sted
        const place = await this.getPlace(slug);
        if (place?.menu.some((c) => c.items.some((i) => i.id === s.soldOut!.itemId))) {
          check(await db.from("menu_items").update({ sold_out: s.soldOut.soldOut }).eq("id", s.soldOut.itemId));
        }
      }
    },
    async updatePlaceDetails(slug, d) {
      if (d.phone !== undefined) check(await db.from("places").update({ phone: d.phone }).eq("slug", slug));
      if (d.hours) {
        check(await db.from("opening_hours").delete().eq("place_slug", slug));
        if (d.hours.length) check(await db.from("opening_hours").insert(d.hours.map((h) => ({ place_slug: slug, ...h }))));
      }
      if (d.menu) {
        // Udsolgt-markeringer følger retten, også når menuen gemmes forfra
        const current = await this.getPlace(slug);
        const soldOut = new Set(current?.menu.flatMap((c) => c.items).filter((i) => i.soldOut).map((i) => i.id));
        check(await db.from("menu_categories").delete().eq("place_slug", slug));
        for (const [position, c] of d.menu.entries()) {
          const category = check(await db.from("menu_categories").insert({ place_slug: slug, name: c.name, position }).select("id").single()) as { id: number };
          if (!c.items.length) continue;
          const items = c.items.map((i, p) => ({
            id: i.id,
            category_id: category.id,
            name: i.name,
            description: i.description ?? null,
            price_kr: i.price,
            sold_out: soldOut.has(i.id),
            position: p,
          }));
          check(await db.from("menu_items").insert(items));
        }
      }
    },
    async checkPanelPin(slug, pin) {
      const row = check(await db.from("places").select("panel_pin_hash").eq("slug", slug).maybeSingle()) as { panel_pin_hash: string | null } | null;
      return Boolean(row?.panel_pin_hash) && row!.panel_pin_hash === sha256(pin);
    },

    async createOrder(o) {
      const row = check(
        await db
          .from("orders")
          .insert({
            place_slug: o.placeSlug,
            place_name: o.placeName,
            customer_name: o.customerName,
            customer_phone: o.customerPhone,
            pickup: o.pickup,
            note: o.note,
            lines: o.lines,
            total_kr: o.total,
          })
          .select()
          .single(),
      );
      return toOrder(row as OrderRow);
    },
    async getOrder(id) {
      const row = check(await db.from("orders").select().eq("id", id).maybeSingle());
      return row ? toOrder(row as OrderRow) : null;
    },
    async listOrders(slug) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const rows = check(await db.from("orders").select().eq("place_slug", slug).gte("created_at", since).order("created_at", { ascending: false }));
      return (rows as OrderRow[]).map(toOrder);
    },
    async setOrderStatus(id, status, readyAt) {
      check(await db.from("orders").update(readyAt ? { status, ready_at: readyAt } : { status }).eq("id", id));
    },

    async createBooking(b) {
      const row = check(
        await db
          .from("bookings")
          .insert({
            place_slug: b.placeSlug,
            place_name: b.placeName,
            customer_name: b.customerName,
            customer_phone: b.customerPhone,
            date: b.date,
            time: b.time,
            guests: b.guests,
            note: b.note,
          })
          .select()
          .single(),
      );
      return toBooking(row as BookingRow);
    },
    async getBooking(id) {
      const row = check(await db.from("bookings").select().eq("id", id).maybeSingle());
      return row ? toBooking(row as BookingRow) : null;
    },
    async listBookings(slug) {
      const rows = check(
        await db.from("bookings").select().eq("place_slug", slug).gte("date", todayInCopenhagen()).order("created_at", { ascending: false }),
      );
      return (rows as BookingRow[]).map(toBooking);
    },
    async setBookingStatus(id, status, suggestedTime) {
      check(await db.from("bookings").update({ status, suggested_time: suggestedTime ?? null }).eq("id", id));
    },
  };
}
