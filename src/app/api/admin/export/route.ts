import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { bookingsSheet, dishesSheet, ordersSheet, placesSheet, toCsv } from "@/lib/export";
import { CITY, SITE } from "@/lib/site";
import { store } from "@/lib/store";

const FILES = ["ordrer", "retter", "steder", "borde"] as const;
type File = (typeof FILES)[number];

// Data til et dashboard som regneark: ?fil=ordrer, retter, steder eller borde. Alt fra start, kun byens egne steder.
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const asked = new URL(request.url).searchParams.get("fil");
  const file: File = FILES.includes(asked as File) ? (asked as File) : "ordrer";
  const places = await store.adminListPlaces();
  const ours = new Set(places.map((p) => p.slug));
  const since = "2026-01-01T00:00:00Z";

  const rows =
    file === "steder"
      ? placesSheet(places, CITY)
      : file === "borde"
        ? bookingsSheet((await store.exportBookings(since)).filter((b) => ours.has(b.placeSlug)), CITY)
        : (file === "ordrer" ? ordersSheet : dishesSheet)((await store.exportOrders(since)).filter((o) => ours.has(o.placeSlug)), CITY);

  return new NextResponse(toCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${SITE.toLowerCase()}-${file}.csv"`, "cache-control": "no-store" },
  });
}
