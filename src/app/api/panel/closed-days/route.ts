import { NextResponse } from "next/server";
import { cleanClosedDays } from "@/lib/closed-days";
import { todayInCopenhagen } from "@/lib/hours";
import { panelSlug } from "@/lib/panel-auth";
import { store } from "@/lib/store";
import { SITE } from "@/lib/site";

// Lukkedage på forhånd. Restauranten sender hele listen hver gang.
export async function POST(request: Request) {
  const slug = await panelSlug();
  if (!slug) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { periods?: unknown } | null;
  const periods = cleanClosedDays(body?.periods, todayInCopenhagen());
  if (!periods.ok) return NextResponse.json({ error: periods.error }, { status: 400 });
  try {
    await store.setClosedDays(slug, periods.value);
  } catch (e) {
    console.error("Kunne ikke gemme lukkedage", e);
    return NextResponse.json({ error: `Lukkedagene kunne ikke gemmes. Ring til ${SITE}, så hjælper vi.` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, periods: periods.value });
}
