import { seedPlaces } from "@/data/places";
import type { AssensEvent } from "../events";
import { bookingWithoutCustomer, withoutCustomer } from "../export";
import { createHash } from "node:crypto";
import { currentClosed, isClosedOn } from "../closed-days";
import { todayInCopenhagen } from "../hours";
import { activeLastChance } from "../last-chance";
import { activeWait, busyUntilFrom, todaysNews } from "../live";
import { shownToPlace, type Subscription } from "../payment";
import type { Booking, Chef, ClosedPeriod, GroupOrder, Order, Place, PlaceNews } from "../types";
import type { PushSubscription, PushTarget, Store } from "./types";

// Gemmer alt i serverens hukommelse. Forsvinder ved genstart, så kun til afprøvning.
type State = { places: Place[]; closedOn: Map<string, string>; orders: Order[]; bookings: Booking[]; nextNumber: number; push: Map<string, PushSubscription>; hidden: Set<string>; pins: Map<string, string>; busyUntil: Map<string, string>; news: Map<string, PlaceNews>; followers: Map<string, Map<string, PushSubscription & { leftovers?: boolean; createdAt?: string }>>; lastChance: Map<string, { itemIds: string[]; until: string }>; groups: Map<string, { group: GroupOrder; hostHash: string; entryHashes: Map<string, string> }>; translations: Map<string, string>; chefs: Map<string, { chef: Chef; photo: string | null }>; events: AssensEvent[]; closedDays: Map<string, ClosedPeriod[]>; placePush: Map<string, PushSubscription[]>; stripe: Map<string, { account: string; ready: boolean }>; subscriptions: Map<string, Subscription> };

const g = globalThis as unknown as { __assensnu?: State };
const state: State = (g.__assensnu ??= {
  places: structuredClone(seedPlaces),
  closedOn: new Map(),
  orders: [],
  bookings: [],
  nextNumber: 101,
  push: new Map(),
  hidden: new Set(),
  pins: new Map(),
  busyUntil: new Map(),
  news: new Map(),
  closedDays: new Map(),
  placePush: new Map(),
  stripe: new Map(),
  subscriptions: new Map(),
  followers: new Map(),
  groups: new Map(),
  lastChance: new Map(),
  translations: new Map(),
  chefs: new Map(),
  events: [],
});
// Tilstand fra før en genstart af udviklingsserveren mangler måske de nyeste felter
state.busyUntil ??= new Map();
state.news ??= new Map();
state.followers ??= new Map();
state.closedDays ??= new Map();
state.placePush ??= new Map();
state.stripe ??= new Map();
state.subscriptions ??= new Map();
state.groups ??= new Map();
state.lastChance ??= new Map();
state.translations ??= new Map();
state.chefs ??= new Map();
state.events ??= [];
const pushKey = (t: PushTarget) => `${t.kind}:${t.id}`;

const DEMO_PIN = "1234";

function withToday(place: Place): Place {
  const news = state.news.get(place.slug);
  return {
    ...place,
    ...activeWait(place.extraWaitMinutes, state.busyUntil.get(place.slug) ?? null),
    news: todaysNews(news?.text, news?.sentAt, news),
    lastChance: activeLastChance(state.lastChance.get(place.slug)),
    chef: state.chefs.get(place.slug)?.chef,
    closedToday: state.closedOn.get(place.slug) === todayInCopenhagen() || isClosedOn(state.closedDays.get(place.slug), todayInCopenhagen()),
    closedDays: currentClosed(state.closedDays.get(place.slug), todayInCopenhagen()),
    member: state.pins.has(place.slug) || Boolean(place.demo),
    onlinePay: (state.stripe.get(place.slug)?.ready && Boolean(process.env.STRIPE_SECRET_KEY?.trim())) || undefined,
  };
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

export const memoryStore: Store = {
  async getPlaces() {
    return state.places.filter((p) => !state.hidden.has(p.slug)).map(withToday);
  },
  async getPlace(slug) {
    const place = state.places.find((p) => p.slug === slug);
    return place ? withToday(place) : null;
  },
  async updatePlaceSettings(slug, s) {
    const place = state.places.find((p) => p.slug === slug);
    if (!place) return;
    if (s.acceptsOrders !== undefined) place.acceptsOrders = s.acceptsOrders;
    if (s.extraWaitMinutes !== undefined) {
      place.extraWaitMinutes = s.extraWaitMinutes;
      const until = busyUntilFrom(s.extraWaitMinutes);
      if (until) state.busyUntil.set(slug, until);
      else state.busyUntil.delete(slug);
    }
    if (s.closedToday !== undefined) {
      if (s.closedToday) state.closedOn.set(slug, todayInCopenhagen());
      else state.closedOn.delete(slug);
    }
    if (s.soldOut) {
      for (const item of place.menu.flatMap((c) => c.items)) {
        if (item.id === s.soldOut.itemId) item.soldOut = s.soldOut.soldOut;
      }
    }
  },
  async updatePlaceDetails(slug, d) {
    const place = state.places.find((p) => p.slug === slug);
    if (!place) return;
    if (d.phone !== undefined) place.phone = d.phone ?? undefined;
    if (d.hours) place.hours = d.hours;
    if (d.delivery !== undefined) place.delivery = d.delivery;
    if (d.menu) {
      const soldOut = new Set(place.menu.flatMap((c) => c.items).filter((i) => i.soldOut).map((i) => i.id));
      place.menu = d.menu.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i, soldOut: soldOut.has(i.id) })) }));
    }
  },
  async checkPanelPin(slug, pin) {
    const place = state.places.find((p) => p.slug === slug);
    const hash = state.pins.get(slug);
    if (hash) return hash === sha256(pin);
    return Boolean(place?.demo) && pin === DEMO_PIN;
  },

  async createOrder(o) {
    const order: Order = { ...o, id: crypto.randomUUID(), number: state.nextNumber++, status: "new", createdAt: new Date().toISOString() };
    state.orders.push(order);
    return order;
  },
  async getOrder(id) {
    return state.orders.find((o) => o.id === id) ?? null;
  },
  async orderFacts(sinceIso, slug) {
    return state.orders.filter((o) => o.createdAt >= sinceIso && (!slug || o.placeSlug === slug) && shownToPlace(o)).map((o) => ({ placeSlug: o.placeSlug, placeName: o.placeName, createdAt: o.createdAt, status: o.status, total: o.total, lines: o.lines }));
  },
  async bookingFacts(sinceIso, slug) {
    return state.bookings.filter((b) => b.createdAt >= sinceIso && b.placeSlug === slug).map((b) => ({ placeSlug: b.placeSlug, createdAt: b.createdAt, status: b.status, guests: b.guests }));
  },
  async exportOrders(sinceIso) {
    return state.orders.filter((o) => o.createdAt >= sinceIso && shownToPlace(o)).map(withoutCustomer);
  },
  async exportBookings(sinceIso) {
    return state.bookings.filter((b) => b.createdAt >= sinceIso).map(bookingWithoutCustomer);
  },
  async followerDates(slug) {
    return [...(state.followers.get(slug)?.values() ?? [])].map((f) => f.createdAt ?? new Date().toISOString());
  },
  async listOrders(slug) {
    return state.orders.filter((o) => o.placeSlug === slug).sort(byNewest);
  },
  async setOrderStatus(id, status, readyAt) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    order.status = status;
    if (readyAt) order.readyAt = readyAt;
  },
  async setOrderPayment(id, payment) {
    const order = state.orders.find((o) => o.id === id);
    if (order) order.payment = payment;
  },
  async getStripeAccount(slug) {
    return state.stripe.get(slug)?.account ?? null;
  },
  async saveStripeAccount(slug, account, ready) {
    state.stripe.set(slug, { account, ready });
  },
  async getSubscription(slug) {
    return state.subscriptions.get(slug) ?? null;
  },
  async saveSubscription(slug, subscription) {
    state.subscriptions.set(slug, subscription);
  },

  async countOrdersByPhone(phone, sinceIso) {
    return state.orders.filter((o) => o.customerPhone === phone && o.createdAt >= sinceIso).length;
  },
  async forgetCustomers(beforeIso) {
    for (const o of state.orders.filter((o) => o.createdAt < beforeIso)) {
      Object.assign(o, { customerName: "Slettet", customerPhone: "", note: undefined, delivery: undefined });
      state.push.delete(pushKey({ kind: "order", id: o.id }));
    }
    for (const b of state.bookings.filter((b) => b.createdAt < beforeIso)) {
      Object.assign(b, { customerName: "Slettet", customerPhone: "", note: undefined });
      state.push.delete(pushKey({ kind: "booking", id: b.id }));
    }
    for (const [id, g] of state.groups) if (g.group.createdAt < beforeIso) state.groups.delete(id);
  },

  async createBooking(b) {
    const booking: Booking = { ...b, id: crypto.randomUUID(), status: "requested", createdAt: new Date().toISOString() };
    state.bookings.push(booking);
    return booking;
  },
  async getBooking(id) {
    return state.bookings.find((b) => b.id === id) ?? null;
  },
  async listBookings(slug) {
    return state.bookings.filter((b) => b.placeSlug === slug).sort(byNewest);
  },
  async setBookingStatus(id, status, suggestedTime) {
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) return;
    booking.status = status;
    booking.suggestedTime = suggestedTime;
  },

  async adminListPlaces() {
    return [...state.places]
      .sort((a, b) => a.name.localeCompare(b.name, "da"))
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        address: p.address,
        cuisines: p.cuisines,
        phone: p.phone,
        takeaway: p.takeaway,
        dineIn: p.dineIn,
        published: !state.hidden.has(p.slug),
        acceptsOrders: p.acceptsOrders,
        acceptsBookings: p.acceptsBookings,
        hasCode: state.pins.has(p.slug) || Boolean(p.demo),
        subscription: state.subscriptions.get(p.slug)?.status,
        hours: p.hours,
        menu: p.menu,
        delivery: p.delivery ?? null,
      }));
  },
  async adminUpdatePlace(slug, patch) {
    const place = state.places.find((p) => p.slug === slug);
    if (!place) return;
    const { published, pinHash, phone, ...rest } = patch;
    Object.assign(place, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
    if (phone !== undefined) place.phone = phone ?? undefined;
    if (published === true) state.hidden.delete(slug);
    if (published === false) state.hidden.add(slug);
    if (pinHash) state.pins.set(slug, pinHash);
  },
  async deletePlace(slug) {
    state.places = state.places.filter((p) => p.slug !== slug);
    state.orders = state.orders.filter((o) => o.placeSlug !== slug);
    state.bookings = state.bookings.filter((b) => b.placeSlug !== slug);
    state.hidden.delete(slug);
    state.pins.delete(slug);
    state.closedOn.delete(slug);
    state.busyUntil.delete(slug);
    state.news.delete(slug);
    state.followers.delete(slug);
  },
  async createPlace(slug, b) {
    state.places.push({
      slug,
      name: b.name,
      address: b.address,
      cuisines: b.cuisines,
      phone: b.phone ?? undefined,
      takeaway: b.takeaway,
      dineIn: b.dineIn,
      hours: [],
      menu: [],
      acceptsOrders: false,
      acceptsBookings: false,
      prepMinutes: 20,
      extraWaitMinutes: 0,
    });
  },

  async postNews(slug, text, price, wasPrice) {
    state.news.set(slug, { text, sentAt: new Date().toISOString(), ...(price && { price }), ...(wasPrice && { wasPrice }) });
  },
  async setClosedDays(slug, periods) {
    state.closedDays.set(slug, periods);
  },
  async setLastChance(slug, value) {
    if (value) state.lastChance.set(slug, value);
    else state.lastChance.delete(slug);
  },
  async setChef(slug, chef, photo) {
    if (!chef) return void state.chefs.delete(slug);
    const old = state.chefs.get(slug);
    const keep = photo === undefined ? (old?.photo ?? null) : photo;
    const photoAt = photo === undefined ? old?.chef.photoAt : photo ? new Date().toISOString() : undefined;
    state.chefs.set(slug, { chef: { ...chef, ...(keep && photoAt && { photoAt }) }, photo: keep });
  },
  async getChefPhoto(slug) {
    return state.chefs.get(slug)?.photo ?? null;
  },
  async follow(slug, subscription, leftovers = false) {
    if (!state.followers.has(slug)) state.followers.set(slug, new Map());
    state.followers.get(slug)!.set(subscription.endpoint, { ...subscription, leftovers, createdAt: state.followers.get(slug)!.get(subscription.endpoint)?.createdAt ?? new Date().toISOString() });
  },
  async unfollow(slug, endpoint) {
    state.followers.get(slug)?.delete(endpoint);
  },
  async listFollowers(slug, only) {
    return [...(state.followers.get(slug)?.values() ?? [])].filter((f) => !only?.leftovers || f.leftovers).map(({ leftovers: _l, createdAt: _c, ...s }) => s); // eslint-disable-line @typescript-eslint/no-unused-vars
  },

  async createGroup(slug, hostName, hostKey) {
    const group: GroupOrder = { id: crypto.randomUUID(), placeSlug: slug, hostName, entries: [], createdAt: new Date().toISOString() };
    state.groups.set(group.id, { group, hostHash: sha256(hostKey), entryHashes: new Map() });
    return structuredClone(group);
  },
  async getGroup(id) {
    const hit = state.groups.get(id);
    return hit ? structuredClone(hit.group) : null;
  },
  async isGroupHost(id, hostKey) {
    return state.groups.get(id)?.hostHash === sha256(hostKey);
  },
  async addGroupEntry(id, name, items, entryKey) {
    const hit = state.groups.get(id);
    if (!hit) throw new Error("Fællesbestillingen findes ikke");
    const entry = { id: crypto.randomUUID(), name, items, createdAt: new Date().toISOString() };
    hit.group.entries.push(entry);
    hit.entryHashes.set(entry.id, sha256(entryKey));
    return structuredClone(entry);
  },
  async removeGroupEntry(id, entryId, key) {
    const hit = state.groups.get(id);
    if (!hit) return false;
    const hash = sha256(key);
    if (hash !== hit.hostHash && hash !== hit.entryHashes.get(entryId)) return false;
    hit.group.entries = hit.group.entries.filter((e) => e.id !== entryId);
    return true;
  },
  async closeGroup(id, orderId) {
    const hit = state.groups.get(id);
    if (hit) hit.group.orderId = orderId;
  },

  async getTranslations(lang, sources) {
    return Object.fromEntries(sources.flatMap((s) => (state.translations.has(`${lang}:${s}`) ? [[s, state.translations.get(`${lang}:${s}`)!]] : [])));
  },
  async saveTranslations(lang, translations) {
    for (const [source, text] of Object.entries(translations)) state.translations.set(`${lang}:${source}`, text);
  },

  async listEvents(fromDate) {
    return state.events.filter((e) => e.date >= fromDate).map((e) => ({ ...e }));
  },
  async getEvent(id) {
    const e = state.events.find((x) => x.id === id);
    return e ? { ...e } : null;
  },
  async saveEvent(event, id) {
    const saved = { ...event, id: id ?? crypto.randomUUID() };
    state.events = [...state.events.filter((e) => e.id !== saved.id), saved];
    return saved;
  },
  async deleteEvent(id) {
    state.events = state.events.filter((e) => e.id !== id);
  },

  async savePush(target, subscription) {
    if (subscription) state.push.set(pushKey(target), subscription);
    else state.push.delete(pushKey(target));
  },
  async savePlacePush(slug, subscription, stop) {
    const others = (state.placePush.get(slug) ?? []).filter((s) => s.endpoint !== subscription.endpoint);
    state.placePush.set(slug, stop ? others : [...others, subscription].slice(-5));
  },
  async listPlacePush(slug) {
    return state.placePush.get(slug) ?? [];
  },
  async getPush(target) {
    return state.push.get(pushKey(target)) ?? null;
  },
};
