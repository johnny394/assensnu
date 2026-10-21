import { NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { weekStart, topDishes, weeklyStats } from "@/lib/stats";
import { todayInCopenhagen } from "@/lib/hours";
import { store } from "@/lib/store";

const WEEKS = 8;

// Ugens tal til restauranten: ordrer, omsætning, borde og følgere
export async function GET() {
  const slug = await panelSlug();
  if (!slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const since = new Date(Date.now() - (WEEKS * 7 + 1) * 24 * 3600_000).toISOString();
  const [orders, bookings, followerDates] = await Promise.all([
    store.orderFacts(since, slug),
    store.bookingFacts(since, slug).catch(() => []),
    store.followerDates(slug).catch(() => []),
  ]);
  const thisWeek = weekStart(todayInCopenhagen());
  return NextResponse.json({
    weeks: weeklyStats({ orders, bookings, followerDates }, new Date(), WEEKS),
    followers: followerDates.length,
    top: topDishes(orders, new Date(`${thisWeek}T00:00:00+01:00`).toISOString()),
  });
}
