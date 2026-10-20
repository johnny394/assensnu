import type { AdminPatch, AdminPlace, PlaceBasics } from "../admin";
import type { Booking, BookingStatus, DeliverySettings, MenuCategory, OpeningPeriod, Order, OrderStatus, Place } from "../types";

export type NewOrder = Omit<Order, "id" | "number" | "status" | "createdAt" | "readyAt">;
export type NewBooking = Omit<Booking, "id" | "status" | "createdAt" | "suggestedTime">;

export type PlaceSettings = {
  acceptsOrders?: boolean;
  closedToday?: boolean;
  extraWaitMinutes?: number;
  soldOut?: { itemId: string; soldOut: boolean };
};

// Det, restauranten selv skriver ind i panelet. Hvert felt erstatter det gamle helt.
export type PlaceDetails = {
  phone?: string | null;
  hours?: OpeningPeriod[];
  menu?: MenuCategory[];
  delivery?: DeliverySettings | null;
};

// En kundes telefon, som vi kan sende en besked til, når restauranten svarer
export type PushTarget = { kind: "order" | "booking"; id: string };
export type PushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

// Alt, appen gemmer og henter. Der er to udgaver: i hukommelsen (til afprøvning)
// og Supabase (til drift). Hvilken der bruges, afgøres i ./index.ts.
export type Store = {
  getPlaces(): Promise<Place[]>;
  getPlace(slug: string): Promise<Place | null>;
  updatePlaceSettings(slug: string, settings: PlaceSettings): Promise<void>;
  updatePlaceDetails(slug: string, details: PlaceDetails): Promise<void>;
  checkPanelPin(slug: string, pin: string): Promise<boolean>;

  createOrder(order: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(slug: string): Promise<Order[]>;
  setOrderStatus(id: string, status: OrderStatus, readyAt?: string): Promise<void>;

  createBooking(booking: NewBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | null>;
  listBookings(slug: string): Promise<Booking[]>;
  setBookingStatus(id: string, status: BookingStatus, suggestedTime?: string): Promise<void>;

  // Johnnys eget panel
  adminListPlaces(): Promise<AdminPlace[]>;
  adminUpdatePlace(slug: string, patch: AdminPatch): Promise<void>;
  createPlace(slug: string, basics: PlaceBasics): Promise<void>;
  /** Sletter stedet for altid, også tider, menu og gamle bestillinger */
  deletePlace(slug: string): Promise<void>;

  /** Dagens tilbud. Erstatter dagens tidligere tekst. */
  postNews(slug: string, text: string, price: number | null, wasPrice: number | null): Promise<void>;
  follow(slug: string, subscription: PushSubscription): Promise<void>;
  unfollow(slug: string, endpoint: string): Promise<void>;
  listFollowers(slug: string): Promise<PushSubscription[]>;

  savePush(target: PushTarget, subscription: PushSubscription | null): Promise<void>;
  getPush(target: PushTarget): Promise<PushSubscription | null>;
};
