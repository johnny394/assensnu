import type { AdminPatch, AdminPlace, PlaceBasics } from "../admin";
import type { Subscription } from "../payment";
import type { AssensEvent } from "../events";
import type { ExportBooking, ExportOrder } from "../export";
import type { BookingFact, OrderFact } from "../stats";
import type { Booking, BookingStatus, CartItem, Chef, ClosedPeriod, DeliverySettings, GroupEntry, GroupOrder, MenuCategory, OpeningPeriod, Order, OrderPayment, OrderStatus, Place } from "../types";

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
// lang: kundens sprog, så "maden er klar" kommer på engelsk eller tysk til turister
export type PushSubscription = { endpoint: string; keys: { p256dh: string; auth: string }; lang?: "en" | "de" };

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
  /** Til tal og fakturering: ordrer siden sinceIso, for ét sted eller alle */
  orderFacts(sinceIso: string, slug?: string): Promise<OrderFact[]>;
  bookingFacts(sinceIso: string, slug: string): Promise<BookingFact[]>;
  /** Til dashboard: alle ordrer og borde siden sinceIso, uden navn, telefon, adresse og besked */
  exportOrders(sinceIso: string): Promise<ExportOrder[]>;
  exportBookings(sinceIso: string): Promise<ExportBooking[]>;
  /** Hvornår hver følger begyndte at følge stedet (ISO) */
  followerDates(slug: string): Promise<string[]>;
  setOrderStatus(id: string, status: OrderStatus, readyAt?: string): Promise<void>;
  setOrderPayment(id: string, payment: OrderPayment): Promise<void>;
  /** Stedets egen Stripe-konto (acct_...), eller null */
  getStripeAccount(slug: string): Promise<string | null>;
  /** ready: Stripe har sagt god for kontoen, så kunderne kan betale online */
  saveStripeAccount(slug: string, account: string, ready: boolean): Promise<void>;
  /** Abonnementet hos ByNu (Stripe-kunde og status), eller null */
  getSubscription(slug: string): Promise<Subscription | null>;
  saveSubscription(slug: string, subscription: Subscription): Promise<void>;

  /** Hvor mange bestillinger et telefonnummer har sendt siden et tidspunkt, på tværs af steder */
  countOrdersByPhone(phone: string, sinceIso: string): Promise<number>;
  /** Fjerner navn, telefon, adresse og besked fra bestillinger, borde og fællesbestillinger, der er ældre end beforeIso */
  forgetCustomers(beforeIso: string): Promise<void>;

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
  /** Sidste chance: retter til halv pris indtil until. null stopper det. */
  setLastChance(slug: string, value: { itemIds: string[]; until: string } | null): Promise<void>;
  /** Lukkedage sat på forhånd. Tom liste fjerner dem. */
  setClosedDays(slug: string, periods: ClosedPeriod[]): Promise<void>;
  /** Mød kokken. photo: undefined beholder billedet, null fjerner det. chef null fjerner det hele. */
  setChef(slug: string, chef: Omit<Chef, "photoAt"> | null, photo: string | null | undefined): Promise<void>;
  /** Billedet som data-URL, eller null */
  getChefPhoto(slug: string): Promise<string | null>;
  /** leftovers: vil også have besked, når stedet sætter rester til halv pris */
  follow(slug: string, subscription: PushSubscription, leftovers?: boolean): Promise<void>;
  unfollow(slug: string, endpoint: string): Promise<void>;
  listFollowers(slug: string, only?: { leftovers: true }): Promise<PushSubscription[]>;

  /** Fællesbestilling. Koderne (hostKey, entryKey) gemmes kun som fingeraftryk. */
  createGroup(slug: string, hostName: string, hostKey: string): Promise<GroupOrder>;
  getGroup(id: string): Promise<GroupOrder | null>;
  isGroupHost(id: string, hostKey: string): Promise<boolean>;
  addGroupEntry(id: string, name: string, items: CartItem[], entryKey: string): Promise<GroupEntry>;
  /** Fjerner en persons mad, hvis koden passer til personen eller til den, der startede */
  removeGroupEntry(id: string, entryId: string, key: string): Promise<boolean>;
  closeGroup(id: string, orderId: string): Promise<void>;

  /** Menuen på engelsk og tysk: de oversættelser, der allerede er lavet, som dansk tekst → oversat */
  getTranslations(lang: string, sources: string[]): Promise<Record<string, string>>;
  saveTranslations(lang: string, translations: Record<string, string>): Promise<void>;

  /** Events i byen. listEvents giver dem fra den dag og frem. */
  listEvents(fromDate: string): Promise<AssensEvent[]>;
  getEvent(id: string): Promise<AssensEvent | null>;
  /** Opretter et nyt event, eller retter det med samme id */
  saveEvent(event: Omit<AssensEvent, "id">, id?: string): Promise<AssensEvent>;
  deleteEvent(id: string): Promise<void>;

  savePush(target: PushTarget, subscription: PushSubscription | null): Promise<void>;
  getPush(target: PushTarget): Promise<PushSubscription | null>;
  /** Restaurantens egne telefoner, der får besked om ordrer uden svar. stop fjerner den. */
  savePlacePush(slug: string, subscription: PushSubscription, stop?: boolean): Promise<void>;
  listPlacePush(slug: string): Promise<PushSubscription[]>;
};
