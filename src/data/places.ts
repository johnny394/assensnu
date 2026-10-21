import type { Place } from "@/lib/types";
import { SITE } from "@/lib/site";

// Startliste samlet 17/10-2026 fra dagensmenu.dk, visitassensinfo.com, vores-assens.dk
// og onlinetakeaway.dk. Telefon, åbningstider og menuer udfyldes, når stederne er tjekket.
// Bruges kun, når Supabase ikke er sat op.
const base = {
  hours: [],
  menu: [],
  acceptsOrders: false,
  acceptsBookings: false,
  prepMinutes: 20,
  extraWaitMinutes: 0,
} satisfies Partial<Place>;

// Prøvested, så man kan afprøve bestilling og restaurantpanel (kode 1234).
// Vises kun, når Supabase ikke er sat op.
const everyDay = (open: string, close: string) =>
  ([0, 1, 2, 3, 4, 5, 6] as const).map((day) => ({ day, open, close }));

export const demoPlace: Place = {
  ...base,
  slug: "proevepizza",
  name: "Prøvepizza (demo)",
  cuisines: ["Pizza", "Kebab"],
  address: "Østergade 1, 5610 Assens",
  phone: "11 22 33 44",
  description: `Et opdigtet sted til at afprøve ${SITE}. Bestillinger her går ingen steder.`,
  takeaway: true,
  dineIn: true,
  acceptsOrders: true,
  acceptsBookings: true,
  demo: true,
  hours: everyDay("11:00", "23:00"),
  menu: [
    {
      name: "Pizza",
      options: {
        sizes: [{ name: "Alm.", extra: 0 }, { name: "Familie", extra: 90 }],
        extras: [{ name: "Ekstra ost", price: 10 }, { name: "Bacon", price: 12 }, { name: "Jalapeños", price: 8 }, { name: "Kebab", price: 16 }],
      },
      items: [
        { id: "d1", name: "Margherita", description: "Tomat og ost", price: 75 },
        { id: "d2", name: "Pepperoni", description: "Tomat, ost og pepperoni", price: 85 },
        { id: "d3", name: "Kebabpizza", description: "Kebab, løg og dressing", price: 95 },
        { id: "d4", name: "Hawaii", description: "Skinke og ananas", price: 85 },
      ],
    },
    {
      name: "Kebab og durum",
      items: [
        { id: "d5", name: "Durum", description: "Kebab, salat og dressing i tyndt brød", price: 70 },
        { id: "d6", name: "Kebab i pitabrød", price: 65 },
        { id: "d7", name: "Kebabtallerken", description: "Med pommes frites og salat", price: 95 },
      ],
    },
    {
      name: "Drikkevarer",
      items: [
        { id: "d8", name: "Sodavand 0,5 l", price: 25 },
        { id: "d9", name: "Kildevand 0,5 l", price: 20 },
      ],
    },
  ],
};

export const seedPlaces: Place[] = [
  demoPlace,
  { ...base, slug: "assens-trattoria", name: "Assens Trattoria", cuisines: ["Italiensk", "Pizza"], address: "Østergade 19, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "cafe-banken", name: "Café Banken", cuisines: ["Café", "Nachos", "Vegetar"], address: "Østergade 14-16, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "frederik-ix", name: "Frederik IX", cuisines: ["Kinesisk", "Steakhouse"], address: "Østergade 44, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "restaurant-bryggen", name: "Restaurant Bryggen", cuisines: ["Italiensk"], address: "Østergade 8, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "plums-gaards-gourmet", name: "Plums Gaards Gourmet", cuisines: ["Europæisk", "Tapas"], address: "Østergade 38, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "skaenkestuen", name: "Skænkestuen Assens", cuisines: ["Restaurant"], address: "Østergade 38, 5610 Assens", takeaway: null, dineIn: true },
  { ...base, slug: "pizza-bella", name: "Pizza Bella & Kebab House", cuisines: ["Pizza", "Kebab"], address: "Østergade 62, 5610 Assens", phone: "64 74 20 06", takeaway: true, dineIn: null },
  { ...base, slug: "pizza-thats-amore", name: "Pizza That's Amore", cuisines: ["Pizza"], address: "Assens", takeaway: true, dineIn: null },
  { ...base, slug: "pomodoro", name: "Pomodoro Pizza Grill House", cuisines: ["Pizza", "Grill"], address: "Damgade 7, 5610 Assens", takeaway: true, dineIn: null },
  { ...base, slug: "la-posta", name: "Restaurant La Posta", cuisines: ["Italiensk", "Pizza"], address: "Søndre Ringvej 2, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "grillhjoernet", name: "Grillhjørnet", cuisines: ["Grill", "Burger"], address: "Nørre Allé 12, 5610 Assens", takeaway: true, dineIn: null },
  { ...base, slug: "havnegrillen", name: "Havnegrillen", cuisines: ["Grill", "Burger", "Dansk"], address: "Nordre Havnevej 14, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "strandporten", name: "Strandporten, Local Food", cuisines: ["Dansk"], address: "Willemoesgade 6, 5610 Assens", takeaway: true, dineIn: true },
  { ...base, slug: "thai-food-assens", name: "Thai Food Assens", cuisines: ["Thai"], address: "Assens", takeaway: null, dineIn: null },
  { ...base, slug: "saigon-dragon", name: "Saigon Dragon", cuisines: ["Vietnamesisk"], address: "Assens", takeaway: null, dineIn: null },
  { ...base, slug: "ella-sushi", name: "Ella Sushi", cuisines: ["Sushi"], address: "Assens", takeaway: null, dineIn: null },
  { ...base, slug: "oneills", name: "O'Neill's", cuisines: ["Pub"], address: "Assens", takeaway: false, dineIn: true },
  { ...base, slug: "cafe-emilo", name: "Café Emilo (Hotel Assens)", cuisines: ["Café", "Restaurant"], address: "Assens", takeaway: null, dineIn: true },
  { ...base, slug: "willemoes-bryghus", name: "Willemoes Bryghus", cuisines: ["Bryghus", "Café"], address: "Assens", takeaway: false, dineIn: true },
  { ...base, slug: "restaurant-maagen", name: "Restaurant Maagen", cuisines: ["Dansk", "Catering"], address: "Assens", takeaway: null, dineIn: true },
];
