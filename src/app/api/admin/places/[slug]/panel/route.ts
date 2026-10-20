import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { loginPanel } from "@/lib/panel-auth";
import { store } from "@/lib/store";

// Johnny åbner et steds restaurantpanel uden deres kode, fx for at hjælpe dem i telefonen
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const { slug } = await params;
  const place = await store.getPlace(slug);
  if (!place) return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });
  await loginPanel(slug);
  return NextResponse.json({ ok: true });
}
