import { createClient } from "@supabase/supabase-js";
import { seedPlaces } from "@/data/places";
import type { Place, Weekday } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && anonKey ? createClient(url, anonKey) : null;

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
  closed_today: string | null;
  opening_hours: { day: number; open: string; close: string }[];
  menu_categories: {
    name: string;
    position: number;
    menu_items: { name: string; description: string | null; price_kr: number; available: boolean; position: number }[];
  }[];
};

const SELECT = `slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, closed_today,
  opening_hours (day, open, close),
  menu_categories (name, position, menu_items (name, description, price_kr, available, position))`;

function todayInCopenhagen(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(new Date());
}

function fromRow(row: PlaceRow): Place {
  const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;
  return {
    slug: row.slug,
    name: row.name,
    cuisines: row.cuisines,
    address: row.address,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    facebook: row.facebook ?? undefined,
    description: row.description ?? undefined,
    takeaway: row.takeaway,
    dineIn: row.dine_in,
    closedToday: row.closed_today === todayInCopenhagen(),
    hours: row.opening_hours.map((h) => ({ day: h.day as Weekday, open: h.open.slice(0, 5), close: h.close.slice(0, 5) })),
    menu: [...row.menu_categories].sort(byPosition).map((c) => ({
      name: c.name,
      items: c.menu_items
        .filter((i) => i.available)
        .sort(byPosition)
        .map((i) => ({ name: i.name, description: i.description ?? undefined, price: Number(i.price_kr) })),
    })),
  };
}

export async function getPlaces(): Promise<Place[]> {
  if (!supabase) return seedPlaces;
  const { data, error } = await supabase.from("places").select(SELECT).order("name");
  if (error) throw error;
  return (data as unknown as PlaceRow[]).map(fromRow);
}

export async function getPlace(slug: string): Promise<Place | null> {
  if (!supabase) return seedPlaces.find((p) => p.slug === slug) ?? null;
  const { data, error } = await supabase.from("places").select(SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as unknown as PlaceRow) : null;
}
