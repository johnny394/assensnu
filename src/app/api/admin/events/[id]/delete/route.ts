import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { store } from "@/lib/store";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  try {
    await store.deleteEvent((await params).id);
  } catch (e) {
    console.error("Kunne ikke slette event", e);
    return NextResponse.json({ error: "Det blev ikke slettet. Prøv igen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
