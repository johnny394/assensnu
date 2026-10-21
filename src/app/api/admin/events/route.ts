import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { cleanEvent } from "@/lib/events";
import { todayInCopenhagen } from "@/lib/hours";
import { store } from "@/lib/store";

// Opret et event, eller ret det, hvis der følger et id med
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const result = cleanEvent(body, todayInCopenhagen());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const id = typeof body?.id === "string" ? body.id : undefined;
  try {
    const event = await store.saveEvent(result.value, id);
    return NextResponse.json({ ok: true, id: event.id });
  } catch (e) {
    console.error("Kunne ikke gemme event", e);
    return NextResponse.json({ error: "Det blev ikke gemt. Har du kørt tilfoej-events.sql i Supabase? Se /status." }, { status: 500 });
  }
}
