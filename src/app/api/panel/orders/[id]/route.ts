import { after, NextResponse } from "next/server";
import { copenhagenNow, toTime } from "@/lib/hours";
import { panelSlug } from "@/lib/panel-auth";
import { notify } from "@/lib/push";
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

  const message =
    status === "ready"
      ? order.delivery
        ? { title: `${order.placeName}: maden er på vej`, body: `Ordre ${order.number} kører ud til dig nu.` }
        : { title: `${order.placeName}: maden er klar`, body: `Ordre ${order.number} kan hentes nu.` }
      : status === "accepted"
        ? { title: `${order.placeName} har fået din bestilling`, body: readyAt ? `Den er klar ca. kl. ${readyAt}.` : "Du får besked, når den er klar." }
        : status === "rejected"
          ? { title: `${order.placeName} kan ikke lave din bestilling`, body: "Tryk for at se mere." }
          : null;
  if (message) after(() => notify({ kind: "order", id: order.id }, { ...message, url: `/ordre/${order.id}` }));
  return NextResponse.json({ ok: true });
}
