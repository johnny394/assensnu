// Ugedage som i Danmark: 0 = mandag ... 6 = søndag
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type OpeningPeriod = {
  day: Weekday;
  open: string; // "HH:MM"
  close: string; // "HH:MM", må gerne være efter midnat, fx "02:00"
};

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number; // kroner
  soldOut?: boolean;
};

// Størrelser og tilvalg gælder for alle retter i en kategori, fx alle pizzaer
export type MenuOptions = {
  sizes: { name: string; extra: number }[]; // den første er standard, extra er kroner oven i rettens pris
  extras: { name: string; price: number }[];
};

export type MenuCategory = {
  name: string;
  items: MenuItem[];
  options?: MenuOptions;
};

// Restauranten kører selv ud. Kunden betaler ved døren.
export type DeliverySettings = {
  fee: number; // kroner for at køre ud
  minimum: number; // mindste beløb for maden, før der kan bestilles levering
  postcodes: string[]; // fx ["5610", "5620"]. Kan være tom, hvis stedet kun kommer ned i havnen eller på campingpladsen
  harbour?: boolean; // kommer også ned i havnen med mad til bådene
  camping?: boolean; // kommer også ud på campingpladsen
};

export type Place = {
  slug: string;
  name: string;
  cuisines: string[];
  address: string;
  phone?: string;
  website?: string;
  facebook?: string;
  description?: string;
  takeaway: boolean | null; // null = ukendt
  dineIn: boolean | null;
  hours: OpeningPeriod[];
  closedToday?: boolean; // "Lukket i dag" eller en lukkedag sat på forhånd
  closedDays?: ClosedPeriod[]; // juleaften, vinterferie og den slags
  menu: MenuCategory[];
  acceptsOrders: boolean; // kan bestilles gennem AssensNu
  acceptsBookings: boolean;
  delivery?: DeliverySettings | null; // null = leverer ikke
  prepMinutes: number; // normal ventetid på takeaway
  extraWaitMinutes: number; // "travlt"-knappen i panelet
  busyUntil?: string; // "HH:MM", når "travlt" slukker af sig selv
  news?: PlaceNews; // dagens tilbud, kun hvis det er skrevet i dag
  chef?: Chef; // Mød kokken
  demo?: boolean;
  member?: boolean; // stedet har sagt ja til AssensNu og har en kode til panelet
  onlinePay?: boolean; // kunderne kan betale med MobilePay og kort gennem stedets egen Stripe-konto
};

// Lukket fra og med from til og med to, fx { from: "2026-12-24", to: "2026-12-26", note: "Jul" }
export type ClosedPeriod = { from: string; to: string; note?: string };

// Restauranten skriver det i panelet, og følgerne får det som besked på telefonen
// sentAt er ISO. Med pris kan tilbuddet bestilles. wasPrice er normalprisen, som vises overstreget.

// Mød kokken: hvem står bag, et par linjer, og hvornår billedet sidst blev skiftet (ISO). Uden photoAt er der intet billede.
export type Chef = { name: string; text: string; photoAt?: string };

export type PlaceNews = { text: string; sentAt: string; price?: number; wasPrice?: number };

export type OrderStatus = "new" | "accepted" | "ready" | "picked_up" | "rejected";

export type OrderLine = {
  itemId: string;
  name: string;
  price: number; // pr. styk, med størrelse og tilvalg
  quantity: number;
  size?: string;
  extras?: string[];
  person?: string; // ved fællesbestilling: hvem retten er til
  halfPrice?: boolean; // gamle ordrer fra "Sidste chance", som ikke findes længere
};

export type Order = {
  id: string;
  number: number; // kort nummer, som kunde og køkken kan sige højt
  placeSlug: string;
  placeName: string;
  customerName: string;
  customerPhone: string;
  pickup: "asap" | string; // "asap" eller "HH:MM"
  delivery?: OrderDelivery; // mangler = kunden henter selv
  note?: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  readyAt?: string; // "HH:MM", sat når restauranten accepterer
  payment?: OrderPayment; // mangler = kunden betaler ved afhentning eller ved døren
  createdAt: string; // ISO
};

// Betalt online gennem Stripe. Kunden betaler, og pengene er reserveret (held). De trækkes først (paid),
// når restauranten trykker Accepter. Afviser restauranten, frigives de igen (released).
// pending: kunden er ved at betale. failed: kunden gav op, eller betalingen gik ikke igennem.
export type PaymentStatus = "pending" | "held" | "paid" | "released" | "failed";
export type OrderPayment = { status: PaymentStatus; session?: string; intent?: string };

// harbour: maden skal ned i havnen, og address er fx "Bro 3, båd Frida" eller "Havnekontoret"
// camping: maden skal ud på campingpladsen, og address er fx "CityCamp Assens Strand, plads 112"
export type OrderDelivery = { address: string; postcode: string; fee: number; harbour?: true; camping?: true };

export type BookingStatus = "requested" | "confirmed" | "declined" | "suggested";

export type Booking = {
  id: string;
  placeSlug: string;
  placeName: string;
  customerName: string;
  customerPhone: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  guests: number;
  note?: string;
  status: BookingStatus;
  suggestedTime?: string; // når restauranten foreslår et andet tidspunkt
  createdAt: string;
};

// Fællesbestilling: én starter den og deler et link. Alle lægger selv deres mad i,
// og den, der startede, sender det hele som én ordre.
export type CartItem = { itemId: string; quantity: number; size?: string; extras?: string[] };
export type GroupEntry = { id: string; name: string; items: CartItem[]; createdAt: string };
export type GroupOrder = { id: string; placeSlug: string; hostName: string; entries: GroupEntry[]; orderId?: string; createdAt: string };
