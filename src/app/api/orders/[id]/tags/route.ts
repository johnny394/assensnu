import { after, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isTagId, MAX_TAGS } from "@/lib/tags";
import { refreshVibe } from "@/lib/vibe";

// Kunden trykker på mikro-tags, når maden er hentet. Linket til ordren er hemmeligt, så det er nok som adgang.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const order = await store.getOrder((await params).id);
  if (!order) return NextResponse.json({ error: "Bestillingen findes ikke." }, { status: 404 });
  if (order.status !== "ready" && order.status !== "picked_up") return NextResponse.json({ error: "Du kan sige din mening, når maden er klar." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = [...new Set(Array.isArray(body?.tags) ? body.tags.filter(isTagId) : [])].slice(0, MAX_TAGS);
  if (tags.length === 0) return NextResponse.json({ error: "Vælg mindst én." }, { status: 400 });

  const saved = await store.saveOrderTags(order.id, tags).catch((e) => {
    console.error("Kunne ikke gemme tags", e);
    return null;
  });
  if (saved === null) return NextResponse.json({ error: "Det gik ikke at gemme lige nu. Prøv igen om lidt." }, { status: 500 });
  // Stemningen på stedets side skrives bagefter, så kunden ikke venter på den
  if (saved) after(() => refreshVibe(order.placeSlug));
  return NextResponse.json({ ok: true, already: !saved });
}
