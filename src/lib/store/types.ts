import type { Booking, BookingStatus, Order, OrderStatus, Place } from "../types";

export type NewOrder = Omit<Order, "id" | "number" | "status" | "createdAt" | "readyAt">;
export type NewBooking = Omit<Booking, "id" | "status" | "createdAt" | "suggestedTime">;

export type PlaceSettings = {
  acceptsOrders?: boolean;
  closedToday?: boolean;
  extraWaitMinutes?: number;
  soldOut?: { itemId: string; soldOut: boolean };
};

// Alt, appen gemmer og henter. Der er to udgaver: i hukommelsen (til afprøvning)
// og Supabase (til drift). Hvilken der bruges, afgøres i ./index.ts.
export type Store = {
  getPlaces(): Promise<Place[]>;
  getPlace(slug: string): Promise<Place | null>;
  updatePlaceSettings(slug: string, settings: PlaceSettings): Promise<void>;
  checkPanelPin(slug: string, pin: string): Promise<boolean>;

  createOrder(order: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(slug: string): Promise<Order[]>;
  setOrderStatus(id: string, status: OrderStatus, readyAt?: string): Promise<void>;

  createBooking(booking: NewBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | null>;
  listBookings(slug: string): Promise<Booking[]>;
  setBookingStatus(id: string, status: BookingStatus, suggestedTime?: string): Promise<void>;
};
