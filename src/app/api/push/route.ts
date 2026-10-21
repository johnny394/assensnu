import { NextResponse } from "next/server";
import { cleanSubscription } from "@/lib/push";
import { store } from "@/lib/store";
import { chooseLang } from "@/lib/translate";

// Kundens telefon melder sig til beskeder om én bestilling eller bordforespørgsel
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { kind?: unknown; id?: unknown; subscription?: unknown } | null;
  const kind = body?.kind === "order" || body?.kind === "booking" ? body.kind : null;
  const id = typeof body?.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : "";
  const subscription = cleanSubscription(body?.subscription);
  if (!kind || !id || !subscription) return NextResponse.json({ error: "Kunne ikke slå beskeder til." }, { status: 400 });

  const exists = kind === "order" ? await store.getOrder(id) : await store.getBooking(id);
  if (!exists) return NextResponse.json({ error: "Findes ikke." }, { status: 404 });
  try {
    const lang = await chooseLang();
    await store.savePush({ kind, id }, { ...subscription, ...(lang !== "da" && { lang }) });
  } catch (e) {
    console.error("Kunne ikke gemme push", e);
    return NextResponse.json({ error: "Kunne ikke slå beskeder til." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
