import { after, NextResponse } from "next/server";
import { groupIsOpen, groupOrderItems } from "@/lib/groups";
import { buildOrder } from "@/lib/orders";
import { tooManyOrders } from "@/lib/privacy";
import { notifyPlace } from "@/lib/push";
import { store } from "@/lib/store";
import { originOf, startPayment } from "@/lib/stripe";

// Så længe må siden leve efter svaret, så den kan minde restauranten om ordren
export const maxDuration = 300;
const UNANSWERED_MINUTES = 3;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const place = body?.slug ? await store.getPlace(String(body.slug)) : null;
  if (!place || !place.member) return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });

  // Fællesbestilling: maden hentes fra fællesbestillingen, ikke fra kurven, og kun den, der startede, kan sende
  let groupId: string | null = null;
  if (body.group) {
    const group = await store.getGroup(String(body.group.id ?? ""));
    if (!group || group.placeSlug !== place.slug || !(await store.isGroupHost(group.id, String(body.group.key ?? ""))))
      return NextResponse.json({ error: "Kun den, der startede fællesbestillingen, kan sende den." }, { status: 403 });
    if (!groupIsOpen(group)) return NextResponse.json({ error: "Fællesbestillingen er allerede sendt." }, { status: 400 });
    body.items = groupOrderItems(group);
    groupId = group.id;
  }

  const result = buildOrder(place, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  if (await tooManyOrders(result.value.customerPhone)) {
    return NextResponse.json({ error: "Der er sendt mange bestillinger fra dit nummer den sidste time. Ring til restauranten, så hjælper de dig." }, { status: 429 });
  }
  // Betal nu med MobilePay eller kort. Ordren når først restauranten, når kunden har betalt.
  // Fællesbestillinger betales stadig ved afhentning.
  const online = body.pay === "online" && place.onlinePay && !groupId;
  const order = await store.createOrder(online ? { ...result.value, payment: { status: "pending" } } : result.value);
  let payUrl: string | null = null;
  if (online) {
    payUrl = await startPayment(order, originOf(request));
    if (!payUrl) {
      await store.setOrderPayment(order.id, { status: "failed" });
      return NextResponse.json({ error: "Betalingen kunne ikke startes. Prøv igen, eller vælg at betale ved afhentning." }, { status: 502 });
    }
  }
  if (groupId) await store.closeGroup(groupId, order.id);
  // Har ingen svaret efter 3 minutter, får restaurantens telefon en besked
  after(async () => {
    await new Promise((r) => setTimeout(r, UNANSWERED_MINUTES * 60_000));
    const now = await store.getOrder(order.id).catch(() => null);
    // En ordre, kunden ikke har betalt endnu, kan restauranten ikke se
    if (now?.status !== "new" || now.payment?.status === "pending" || now.payment?.status === "failed") return;
    await notifyPlace(place.slug, {
      title: `Ordre ${order.number} venter på svar`,
      body: `${order.customerName} har ventet i ${UNANSWERED_MINUTES} minutter. Tryk for at svare.`,
      url: "/panel",
    });
  });
  return NextResponse.json({ id: order.id, ...(payUrl && { payUrl }) });
}
