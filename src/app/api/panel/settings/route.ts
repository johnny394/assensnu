import { NextResponse } from "next/server";
import { WAIT_STEPS } from "@/lib/live";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";
import type { PlaceSettings } from "@/lib/store/types";

export async function POST(request: Request) {
  const slug = await panelSlug();
  if (!slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const s = (await request.json()) as PlaceSettings;
  const settings: PlaceSettings = {
    acceptsOrders: typeof s.acceptsOrders === "boolean" ? s.acceptsOrders : undefined,
    closedToday: typeof s.closedToday === "boolean" ? s.closedToday : undefined,
    extraWaitMinutes: WAIT_STEPS.some((w) => w.extra === s.extraWaitMinutes) ? s.extraWaitMinutes : undefined,
    soldOut: s.soldOut && typeof s.soldOut.itemId === "string" ? { itemId: s.soldOut.itemId, soldOut: Boolean(s.soldOut.soldOut) } : undefined,
  };
  await store.updatePlaceSettings(slug, settings);
  return NextResponse.json({ ok: true });
}
