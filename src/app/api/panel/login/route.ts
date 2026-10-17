import { NextResponse } from "next/server";
import { loginPanel } from "@/lib/panel-auth";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  const { slug, pin } = (await request.json().catch(() => ({}))) as { slug?: string; pin?: string };
  if (!slug || !pin || !(await store.checkPanelPin(slug, pin))) {
    return NextResponse.json({ error: "Koden passer ikke. Prøv igen, eller ring til AssensNu." }, { status: 401 });
  }
  await loginPanel(slug);
  return NextResponse.json({ ok: true });
}
