import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { toCsv } from "@/lib/export";
import { todayInCopenhagen } from "@/lib/hours";
import { monthByPlace, monthStartIso } from "@/lib/stats";
import { SITE } from "@/lib/site";
import { store } from "@/lib/store";

// Alle ordrer på tværs af steder i én måned, til fakturering. ?format=csv giver et regneark.
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month")! : todayInCopenhagen().slice(0, 7);
  // Kun byens egne steder, så hver by kan faktureres for sig
  const ours = new Set((await store.adminListPlaces()).map((p) => p.slug));
  const facts = (await store.orderFacts(new Date(monthStartIso(month)).toISOString())).filter((f) => ours.has(f.placeSlug));
  const rows = monthByPlace(facts, month);

  if (params.get("format") === "csv") {
    const lines = [["Sted", "Ordrer", "Omsætning (kr.)", "Afviste"], ...rows.map((r) => [r.placeName, r.orders, r.revenue, r.rejected])];
    return new NextResponse(toCsv(lines), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${SITE.toLowerCase()}-ordrer-${month}.csv"` },
    });
  }
  return NextResponse.json({ month, rows });
}
