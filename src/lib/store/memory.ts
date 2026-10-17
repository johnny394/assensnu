import { seedPlaces } from "@/data/places";
import { todayInCopenhagen } from "../hours";
import type { Booking, Order, Place } from "../types";
import type { Store } from "./types";

// Gemmer alt i serverens hukommelse. Forsvinder ved genstart, så kun til afprøvning.
type State = { places: Place[]; closedOn: Map<string, string>; orders: Order[]; bookings: Booking[]; nextNumber: number };

const g = globalThis as unknown as { __assensnu?: State };
const state: State = (g.__assensnu ??= {
  places: structuredClone(seedPlaces),
  closedOn: new Map(),
  orders: [],
  bookings: [],
  nextNumber: 101,
});

const DEMO_PIN = "1234";

function withToday(place: Place): Place {
  return { ...place, closedToday: state.closedOn.get(place.slug) === todayInCopenhagen() };
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

export const memoryStore: Store = {
  async getPlaces() {
    return state.places.map(withToday);
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
  async checkPanelPin(slug, pin) {
    const place = state.places.find((p) => p.slug === slug);
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
};
