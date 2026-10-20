import { seedPlaces } from "@/data/places";
import { createHash } from "node:crypto";
import { todayInCopenhagen } from "../hours";
import type { Booking, Order, Place } from "../types";
import type { PushSubscription, PushTarget, Store } from "./types";

// Gemmer alt i serverens hukommelse. Forsvinder ved genstart, så kun til afprøvning.
type State = { places: Place[]; closedOn: Map<string, string>; orders: Order[]; bookings: Booking[]; nextNumber: number; push: Map<string, PushSubscription>; hidden: Set<string>; pins: Map<string, string> };

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
});
const pushKey = (t: PushTarget) => `${t.kind}:${t.id}`;

const DEMO_PIN = "1234";

function withToday(place: Place): Place {
  return {
    ...place,
    closedToday: state.closedOn.get(place.slug) === todayInCopenhagen(),
    member: state.pins.has(place.slug) || Boolean(place.demo),
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
    if (s.extraWaitMinutes !== undefined) place.extraWaitMinutes = s.extraWaitMinutes;
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
  async listOrders(slug) {
    return state.orders.filter((o) => o.placeSlug === slug).sort(byNewest);
  },
  async setOrderStatus(id, status, readyAt) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    order.status = status;
    if (readyAt) order.readyAt = readyAt;
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
        hours: p.hours,
        hasMenu: p.menu.length > 0,
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

  async savePush(target, subscription) {
    if (subscription) state.push.set(pushKey(target), subscription);
    else state.push.delete(pushKey(target));
  },
  async getPush(target) {
    return state.push.get(pushKey(target)) ?? null;
  },
};
