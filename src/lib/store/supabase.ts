import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { currentClosed, isClosedOn } from "../closed-days";
import { todayInCopenhagen } from "../hours";
import { activeLastChance } from "../last-chance";
import { activeWait, busyUntilFrom, todaysNews } from "../live";
import type { Booking, Chef, ClosedPeriod, GroupEntry, GroupOrder, MenuCategory, Order, Place, Weekday } from "../types";
import type { AssensEvent } from "../events";
import type { PushSubscription, Store } from "./types";

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
  delivery: Place["delivery"];
  prep_minutes: number;
  extra_wait_minutes: number;
  busy_until?: string | null;
  news?: string | null;
  news_at?: string | null;
  news_price?: number | null;
  news_was_price?: number | null;
  last_chance?: { itemIds: string[]; until: string } | null;
  chef?: Chef | null;
  closed_on: string | null;
  closed_days?: ClosedPeriod[] | null;
  panel_pin_hash: string | null;
  opening_hours: { day: number; open: string; close: string }[];
  menu_categories: {
    name: string;
    position: number;
    options?: MenuCategory["options"] | null;
    menu_items: { id: string; name: string; description: string | null; price_kr: number; sold_out: boolean; position: number }[];
  }[];
};

const PLACE_SELECT = `slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in,
  accepts_orders, accepts_bookings, delivery, prep_minutes, extra_wait_minutes, busy_until, news, news_at, news_price, news_was_price, last_chance, chef, closed_on, closed_days, panel_pin_hash,
  opening_hours (day, open, close),
  menu_categories (name, position, options, menu_items (id, name, description, price_kr, sold_out, position))`;

// Indtil tilfoej-levering.sql, tilfoej-tilvalg.sql, tilfoej-folg.sql, tilfoej-dagens-ret.sql, tilfoej-tilbud.sql og tilfoej-sidste-chance.sql er kørt, findes de nyere kolonner ikke.
// Så spørger vi uden dem, så siden virker som før, bare uden levering, tilvalg, dagens tilbud og travlt-tid.
type Res = { data: unknown; error: unknown };
const NEWER_COLUMNS = [["delivery"], ["options"], ["busy_until", "news", "news_at"], ["news_price"], ["news_was_price"], ["last_chance"], ["chef"], ["closed_days"]];
const mentions = (error: unknown, column: string) => new RegExp(`\\b${column}\\b`).test(String((error as { message?: string } | null)?.message));
async function withFallback(select: string, run: (select: string) => PromiseLike<Res>): Promise<Res> {
  let res = await run(select);
  for (const columns of NEWER_COLUMNS) {
    if (!columns.some((c) => mentions(res.error, c))) continue;
    for (const c of columns) select = select.replace(`${c}, `, "");
    res = await run(select);
  }
  return res;
}

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
    delivery: r.delivery ?? null,
    prepMinutes: r.prep_minutes,
    ...activeWait(r.extra_wait_minutes, r.busy_until ?? null),
    news: todaysNews(r.news, r.news_at, { price: r.news_price, wasPrice: r.news_was_price }),
    lastChance: activeLastChance(r.last_chance),
    chef: r.chef ?? undefined,
    closedToday: r.closed_on === todayInCopenhagen() || isClosedOn(r.closed_days ?? undefined, todayInCopenhagen()),
    closedDays: currentClosed(r.closed_days, todayInCopenhagen()),
    demo: r.slug === "proevepizza" || undefined,
    // Kun ja/nej sendes videre, aldrig selve fingeraftrykket af koden
    member: Boolean(r.panel_pin_hash),
    hours: r.opening_hours.map((h) => ({ day: h.day as Weekday, open: h.open.slice(0, 5), close: h.close.slice(0, 5) })),
    menu: toMenu(r.menu_categories),
  };
}

function toMenu(categories: PlaceRow["menu_categories"]): MenuCategory[] {
  return [...categories].sort(byPosition).map((c) => ({
    name: c.name,
    ...(c.options && { options: c.options }),
    items: [...c.menu_items].sort(byPosition).map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description ?? undefined,
      price: Number(i.price_kr),
      soldOut: i.sold_out,
    })),
  }));
}

type OrderRow = {
  id: string;
  number: number;
  place_slug: string;
  place_name: string;
  customer_name: string;
  customer_phone: string;
  pickup: string;
  delivery: Order["delivery"] | null;
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
  delivery: r.delivery ?? undefined,
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

type GroupRow = {
  id: string;
  place_slug: string;
  host_name: string;
  order_id: string | null;
  created_at: string;
  group_entries?: { id: string; name: string; items: GroupEntry["items"]; created_at: string }[];
};

const toGroup = (r: GroupRow): GroupOrder => ({
  id: r.id,
  placeSlug: r.place_slug,
  hostName: r.host_name,
  orderId: r.order_id ?? undefined,
  createdAt: r.created_at,
  entries: [...(r.group_entries ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => ({ id: e.id, name: e.name, items: e.items, createdAt: e.created_at })),
});

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

const translationKey = (lang: string, source: string) => sha256(`${lang}\n${source}`).slice(0, 24);
export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function supabaseStore(url: string, serviceKey: string): Store {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const check = <T>({ data, error }: { data: T; error: unknown }) => {
    if (error) throw error;
    return data;
  };

  return {
    async getPlaces() {
      const res = await withFallback(PLACE_SELECT, (select) => db.from("places").select(select).eq("published", true).order("name"));
      const rows = check(res);
      return (rows as unknown as PlaceRow[]).map(toPlace);
    },
    async getPlace(slug) {
      const res = await withFallback(PLACE_SELECT, (select) => db.from("places").select(select).eq("slug", slug).maybeSingle());
      const row = check(res);
      return row ? toPlace(row as unknown as PlaceRow) : null;
    },
    async updatePlaceSettings(slug, s) {
      const patch: Record<string, unknown> = {};
      if (s.acceptsOrders !== undefined) patch.accepts_orders = s.acceptsOrders;
      if (s.extraWaitMinutes !== undefined) {
        patch.extra_wait_minutes = s.extraWaitMinutes;
        patch.busy_until = busyUntilFrom(s.extraWaitMinutes);
      }
      if (s.closedToday !== undefined) patch.closed_on = s.closedToday ? todayInCopenhagen() : null;
      if (Object.keys(patch).length) {
        let res = await db.from("places").update(patch).eq("slug", slug);
        // Uden tilfoej-folg.sql virker travlt-knappen som før, bare uden at slukke af sig selv
        if (mentions(res.error, "busy_until")) {
          delete patch.busy_until;
          res = await db.from("places").update(patch).eq("slug", slug);
        }
        check(res);
      }
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
      if (d.delivery !== undefined) check(await db.from("places").update({ delivery: d.delivery }).eq("slug", slug));
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
          const row = { place_slug: slug, name: c.name, position, ...(c.options && { options: c.options }) };
          const category = check(await db.from("menu_categories").insert(row).select("id").single()) as { id: number };
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
            ...(o.delivery && { delivery: o.delivery }),
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

    async countOrdersByPhone(phone, sinceIso) {
      const res = await db.from("orders").select("id", { count: "exact", head: true }).eq("customer_phone", phone).gte("created_at", sinceIso);
      check(res);
      return res.count ?? 0;
    },
    async forgetCustomers(beforeIso) {
      // Ordrenumre, beløb og retter bliver, så restauranten stadig kan se sin omsætning
      check(await db.from("orders").update({ customer_name: "Slettet", customer_phone: "", note: null, delivery: null, push: null }).lt("created_at", beforeIso).neq("customer_phone", ""));
      check(await db.from("bookings").update({ customer_name: "Slettet", customer_phone: "", note: null, push: null }).lt("created_at", beforeIso).neq("customer_phone", ""));
      check(await db.from("group_orders").delete().lt("created_at", beforeIso));
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

    async adminListPlaces() {
      const select =
        "slug, name, address, cuisines, phone, takeaway, dine_in, published, accepts_orders, accepts_bookings, delivery, panel_pin_hash, opening_hours (day, open, close), menu_categories (name, position, options, menu_items (id, name, description, price_kr, sold_out, position))";
      const res = await withFallback(select, (s) => db.from("places").select(s).order("name"));
      const rows = check(res) as unknown as (Pick<PlaceRow, "slug" | "name" | "address" | "cuisines" | "phone" | "takeaway" | "dine_in" | "accepts_orders" | "accepts_bookings" | "delivery"> & {
        published: boolean;
        panel_pin_hash: string | null;
        opening_hours: { day: number; open: string; close: string }[];
        menu_categories: PlaceRow["menu_categories"];
      })[];
      return rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        address: r.address,
        cuisines: r.cuisines,
        phone: r.phone ?? undefined,
        takeaway: r.takeaway,
        dineIn: r.dine_in,
        published: r.published,
        acceptsOrders: r.accepts_orders,
        acceptsBookings: r.accepts_bookings,
        hasCode: Boolean(r.panel_pin_hash),
        hours: r.opening_hours
          .map((h) => ({ day: h.day as Weekday, open: h.open.slice(0, 5), close: h.close.slice(0, 5) }))
          .sort((a, b) => a.day - b.day || a.open.localeCompare(b.open)),
        menu: toMenu(r.menu_categories),
        delivery: r.delivery ?? null,
      }));
    },
    async adminUpdatePlace(slug, p) {
      const patch: Record<string, unknown> = {};
      if (p.name !== undefined) patch.name = p.name;
      if (p.address !== undefined) patch.address = p.address;
      if (p.cuisines !== undefined) patch.cuisines = p.cuisines;
      if (p.phone !== undefined) patch.phone = p.phone;
      if (p.takeaway !== undefined) patch.takeaway = p.takeaway;
      if (p.dineIn !== undefined) patch.dine_in = p.dineIn;
      if (p.published !== undefined) patch.published = p.published;
      if (p.acceptsOrders !== undefined) patch.accepts_orders = p.acceptsOrders;
      if (p.acceptsBookings !== undefined) patch.accepts_bookings = p.acceptsBookings;
      if (p.pinHash !== undefined) patch.panel_pin_hash = p.pinHash;
      if (Object.keys(patch).length) check(await db.from("places").update(patch).eq("slug", slug));
    },
    async createPlace(slug, b) {
      check(
        await db.from("places").insert({
          slug,
          name: b.name,
          address: b.address,
          cuisines: b.cuisines,
          phone: b.phone,
          takeaway: b.takeaway,
          dine_in: b.dineIn,
          published: true,
        }),
      );
    },
    async deletePlace(slug) {
      // Bestillinger og bordforespørgsler holder fast i stedet, så de skal ud først.
      // Tider og menukort forsvinder af sig selv sammen med stedet.
      check(await db.from("bookings").delete().eq("place_slug", slug));
      check(await db.from("orders").delete().eq("place_slug", slug));
      check(await db.from("places").delete().eq("slug", slug));
    },

    async postNews(slug, text, price, wasPrice) {
      const patch: Record<string, unknown> = { news: text, news_at: new Date().toISOString(), news_price: price, news_was_price: wasPrice };
      let res = await db.from("places").update(patch).eq("slug", slug);
      // Uden tilfoej-tilbud.sql virker tilbuddet stadig, bare uden normalpris.
      // Uden tilfoej-dagens-ret.sql kan teksten lægges ud, bare uden pris.
      for (const column of ["news_was_price", "news_price"]) {
        if (!mentions(res.error, column) || (column === "news_price" && price)) continue;
        delete patch[column];
        res = await db.from("places").update(patch).eq("slug", slug);
      }
      check(res);
    },
    async setLastChance(slug, value) {
      check(await db.from("places").update({ last_chance: value }).eq("slug", slug));
    },
    async setClosedDays(slug, periods) {
      check(await db.from("places").update({ closed_days: periods }).eq("slug", slug));
    },
    async setChef(slug, chef, photo) {
      // Billedet ligger i sin egen kolonne, så listen over steder ikke bliver tung
      const patch: Record<string, unknown> = {};
      if (!chef) Object.assign(patch, { chef: null, chef_photo: null });
      else {
        let photoAt: string | undefined;
        if (photo === undefined) {
          const row = check(await db.from("places").select("chef").eq("slug", slug).maybeSingle()) as { chef: Chef | null } | null;
          photoAt = row?.chef?.photoAt;
        } else {
          patch.chef_photo = photo;
          photoAt = photo ? new Date().toISOString() : undefined;
        }
        patch.chef = { ...chef, ...(photoAt && { photoAt }) };
      }
      check(await db.from("places").update(patch).eq("slug", slug));
    },
    async getChefPhoto(slug) {
      const row = check(await db.from("places").select("chef_photo").eq("slug", slug).maybeSingle()) as { chef_photo: string | null } | null;
      return row?.chef_photo ?? null;
    },
    async follow(slug, subscription, leftovers = false) {
      const row = { place_slug: slug, endpoint: subscription.endpoint, push: subscription, leftovers };
      let res = await db.from("followers").upsert(row);
      // Uden tilfoej-rester-besked.sql kan man stadig følge, bare uden besked om rester
      if (mentions(res.error, "leftovers") && !leftovers) res = await db.from("followers").upsert({ ...row, leftovers: undefined });
      check(res);
    },
    async unfollow(slug, endpoint) {
      check(await db.from("followers").delete().eq("place_slug", slug).eq("endpoint", endpoint));
    },
    async listFollowers(slug, only) {
      let query = db.from("followers").select("push").eq("place_slug", slug);
      if (only?.leftovers) query = query.eq("leftovers", true);
      const res = await query;
      if (only?.leftovers && mentions(res.error, "leftovers")) return [];
      const rows = check(res) as { push: PushSubscription }[];
      return rows.map((r) => r.push);
    },

    async createGroup(slug, hostName, hostKey) {
      const row = check(await db.from("group_orders").insert({ place_slug: slug, host_name: hostName, host_hash: sha256(hostKey) }).select("id, place_slug, host_name, order_id, created_at").single());
      return toGroup(row as GroupRow);
    },
    async getGroup(id) {
      if (!isUuid(id)) return null;
      const row = check(
        await db.from("group_orders").select("id, place_slug, host_name, order_id, created_at, group_entries (id, name, items, created_at)").eq("id", id).maybeSingle(),
      );
      return row ? toGroup(row as GroupRow) : null;
    },
    async isGroupHost(id, hostKey) {
      if (!isUuid(id)) return false;
      const row = check(await db.from("group_orders").select("host_hash").eq("id", id).maybeSingle()) as { host_hash: string } | null;
      return row?.host_hash === sha256(hostKey);
    },
    async addGroupEntry(id, name, items, entryKey) {
      const row = check(
        await db.from("group_entries").insert({ group_id: id, name, items, entry_hash: sha256(entryKey) }).select("id, name, items, created_at").single(),
      ) as { id: string; name: string; items: GroupEntry["items"]; created_at: string };
      return { id: row.id, name: row.name, items: row.items, createdAt: row.created_at };
    },
    async removeGroupEntry(id, entryId, key) {
      if (!isUuid(id) || !isUuid(entryId)) return false;
      const hash = sha256(key);
      const host = await this.isGroupHost(id, key);
      let query = db.from("group_entries").delete().eq("group_id", id).eq("id", entryId);
      if (!host) query = query.eq("entry_hash", hash);
      const rows = check(await query.select("id")) as unknown[];
      return rows.length > 0;
    },
    async closeGroup(id, orderId) {
      check(await db.from("group_orders").update({ order_id: orderId }).eq("id", id));
    },

    async getTranslations(lang, sources) {
      const keys = new Map(sources.map((s) => [translationKey(lang, s), s]));
      const found: Record<string, string> = {};
      // I bidder, så adressen til databasen ikke bliver for lang
      const all = [...keys.keys()];
      for (let i = 0; i < all.length; i += 100) {
        const rows = check(await db.from("translations").select("key, text").in("key", all.slice(i, i + 100))) as { key: string; text: string }[];
        for (const r of rows) found[keys.get(r.key)!] = r.text;
      }
      return found;
    },
    async saveTranslations(lang, translations) {
      const rows = Object.entries(translations).map(([source, text]) => ({ key: translationKey(lang, source), lang, source, text }));
      if (rows.length) check(await db.from("translations").upsert(rows));
    },

    async listEvents(fromDate) {
      const res = await db.from("events").select("id, title, date, time, venue, text, link").gte("date", fromDate).order("date").order("time");
      // Uden tabellen (tilfoej-events.sql ikke kørt) er der bare ingen events endnu
      if (res.error) return [];
      return (res.data as EventRow[]).map(toEvent);
    },
    async getEvent(id) {
      const res = await db.from("events").select("id, title, date, time, venue, text, link").eq("id", id).maybeSingle();
      return res.error || !res.data ? null : toEvent(res.data as EventRow);
    },
    async saveEvent(event, id) {
      const row = { title: event.title, date: event.date, time: event.time, venue: event.venue, text: event.text ?? null, link: event.link ?? null };
      const saved = check(
        id
          ? await db.from("events").update(row).eq("id", id).select("id, title, date, time, venue, text, link").single()
          : await db.from("events").insert(row).select("id, title, date, time, venue, text, link").single(),
      ) as EventRow;
      return toEvent(saved);
    },
    async deleteEvent(id) {
      check(await db.from("events").delete().eq("id", id));
    },

    async savePush({ kind, id }, subscription) {
      check(await db.from(kind === "order" ? "orders" : "bookings").update({ push: subscription }).eq("id", id));
    },
    async getPush({ kind, id }) {
      const row = check(await db.from(kind === "order" ? "orders" : "bookings").select("push").eq("id", id).maybeSingle()) as { push: PushSubscription | null } | null;
      return row?.push ?? null;
    },
  };
}

type EventRow = { id: string; title: string; date: string; time: string; venue: string; text: string | null; link: string | null };
const toEvent = (r: EventRow): AssensEvent => ({ id: r.id, title: r.title, date: r.date, time: r.time.slice(0, 5), venue: r.venue, text: r.text ?? undefined, link: r.link ?? undefined });
