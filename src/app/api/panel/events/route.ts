import { NextResponse } from "next/server";
import { cleanEvent } from "@/lib/events";
import { todayInCopenhagen } from "@/lib/hours";
import { panelSlug } from "@/lib/panel-auth";
import { PLANS } from "@/lib/plans";
import { store } from "@/lib/store";

// Stedets egne events. Med Event eller Fuld pakke kan de selv lægge dem ud.
export async function GET() {
  const slug = await panelSlug();
  if (!slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const events = await store.listEvents(todayInCopenhagen()).catch(() => []);
  return NextResponse.json({ events: events.filter((e) => e.placeSlug === slug) });
}

// Opret et event, eller ret et af stedets egne, hvis der følger et id med
export async function POST(request: Request) {
  const slug = await panelSlug();
  const place = slug ? await store.getPlace(slug) : null;
  if (!place) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  if (!PLANS[place.plan ?? "fuld"].events) return NextResponse.json({ error: "Events er med i Event-pakken og Fuld pakke." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const result = cleanEvent(body, todayInCopenhagen());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const id = typeof body?.id === "string" ? body.id : undefined;
  if (id && (await store.getEvent(id))?.placeSlug !== place.slug) return NextResponse.json({ error: "Det event findes ikke." }, { status: 404 });
  try {
    const event = await store.saveEvent({ ...result.value, placeSlug: place.slug }, id);
    return NextResponse.json({ ok: true, id: event.id });
  } catch (e) {
    console.error("Kunne ikke gemme event", e);
    return NextResponse.json({ error: "Det blev ikke gemt. Prøv igen om lidt." }, { status: 500 });
  }
}
