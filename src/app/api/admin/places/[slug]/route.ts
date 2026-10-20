import { NextResponse } from "next/server";
import { cleanBasics, hashPin, newPin, type AdminPatch } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";
import { store } from "@/lib/store";

// Ret et sted: oplysninger, til/fra og ny kode til restaurantpanelet
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const { slug } = await params;
  const place = (await store.adminListPlaces()).find((p) => p.slug === slug);
  if (!place) return NextResponse.json({ error: "Stedet findes ikke." }, { status: 404 });

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const patch: AdminPatch = {};
  if (body.basics !== undefined) {
    const basics = cleanBasics(body.basics);
    if (!basics.ok) return NextResponse.json({ error: basics.error }, { status: 400 });
    Object.assign(patch, basics.value);
  }
  for (const key of ["published", "acceptsOrders", "acceptsBookings"] as const) {
    if (typeof body[key] === "boolean") patch[key] = body[key];
  }
  // Koden vises kun denne ene gang. Databasen gemmer kun et fingeraftryk af den.
  const pin = body.newCode === true ? newPin() : undefined;
  if (pin) patch.pinHash = hashPin(pin);

  try {
    await store.adminUpdatePlace(slug, patch);
  } catch (e) {
    console.error("Kunne ikke gemme sted", e);
    return NextResponse.json({ error: "Det blev ikke gemt. Prøv igen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...(pin && { pin }) });
}
