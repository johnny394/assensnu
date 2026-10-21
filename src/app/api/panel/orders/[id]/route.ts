import { after, NextResponse } from "next/server";
import { copenhagenNow, toTime } from "@/lib/hours";
import { panelSlug } from "@/lib/panel-auth";
import { notify } from "@/lib/push";
import { store } from "@/lib/store";
import type { T } from "@/lib/i18n";
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

  const navn = order.placeName;
  const n = order.number;
  const message = (t: T) =>
    status === "ready"
      ? order.delivery
        ? { title: t("{navn}: maden er på vej", { navn }), body: t("Ordre {n} kører ud til dig nu.", { n }) }
        : { title: t("{navn}: maden er klar", { navn }), body: t("Ordre {n} kan hentes nu.", { n }) }
      : status === "accepted"
        ? { title: t("{navn} har fået din bestilling", { navn }), body: readyAt ? t("Den er klar ca. kl. {tid}.", { tid: readyAt }) : t("Du får besked, når den er klar.") }
        : { title: t("{navn} kan ikke lave din bestilling", { navn }), body: t("Tryk for at se mere.") };
  if (status !== "picked_up") after(() => notify({ kind: "order", id: order.id }, (t) => ({ ...message(t), url: `/ordre/${order.id}` })));
  return NextResponse.json({ ok: true });
}
