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

export type MenuCategory = {
  name: string;
  items: MenuItem[];
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
  closedToday?: boolean;
  menu: MenuCategory[];
  acceptsOrders: boolean; // kan bestilles gennem AssensNu
  acceptsBookings: boolean;
  prepMinutes: number; // normal ventetid på takeaway
  extraWaitMinutes: number; // "travlt"-knappen i panelet
  demo?: boolean;
};

export type OrderStatus = "new" | "accepted" | "ready" | "picked_up" | "rejected";

export type OrderLine = { itemId: string; name: string; price: number; quantity: number };

export type Order = {
  id: string;
  number: number; // kort nummer, som kunde og køkken kan sige højt
  placeSlug: string;
  placeName: string;
  customerName: string;
  customerPhone: string;
  pickup: "asap" | string; // "asap" eller "HH:MM"
  note?: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  readyAt?: string; // "HH:MM", sat når restauranten accepterer
  createdAt: string; // ISO
};

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
