import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { store } from "@/lib/store";

// Slet et sted, der er lukket for altid
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const { slug } = await params;
  if (!(await store.adminListPlaces()).some((p) => p.slug === slug)) {
    return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });
  }
  try {
    await store.deletePlace(slug);
  } catch (e) {
    console.error("Kunne ikke slette sted", e);
    return NextResponse.json({ error: "Stedet blev ikke slettet. Prøv igen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
