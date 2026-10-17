import { NextResponse } from "next/server";
import { copenhagenNow, toTime } from "@/lib/hours";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["accepted", "ready", "picked_up", "rejected"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const slug = await panelSlug();
  const order = await store.getOrder((await params).id);
  if (!slug || !order || order.placeSlug !== slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });

  const { status, readyInMinutes } = (await request.json()) as { status: OrderStatus; readyInMinutes?: number };
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Ukendt status." }, { status: 400 });
  // Har kunden valgt et tidspunkt, er det det, restauranten lover
  const readyAt =
    status !== "accepted" ? undefined : order.pickup !== "asap" ? order.pickup : readyInMinutes ? toTime(copenhagenNow().minutes + readyInMinutes) : undefined;
  await store.setOrderStatus(order.id, status, readyAt);
  return NextResponse.json({ ok: true });
}
