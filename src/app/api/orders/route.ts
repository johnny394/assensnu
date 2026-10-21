import { NextResponse } from "next/server";
import { groupIsOpen, groupOrderItems } from "@/lib/groups";
import { buildOrder } from "@/lib/orders";
import { tooManyOrders } from "@/lib/privacy";
import { store } from "@/lib/store";

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
  const order = await store.createOrder(result.value);
  if (groupId) await store.closeGroup(groupId, order.id);
  return NextResponse.json({ id: order.id });
}
