import { NextResponse } from "next/server";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";

// Stedet kan kun slette sine egne events
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const slug = await panelSlug();
  if (!slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const { id } = await params;
  if ((await store.getEvent(id))?.placeSlug !== slug) return NextResponse.json({ error: "Det event findes ikke." }, { status: 404 });
  try {
    await store.deleteEvent(id);
  } catch (e) {
    console.error("Kunne ikke slette event", e);
    return NextResponse.json({ error: "Det blev ikke slettet. Prøv igen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
