import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { todayInCopenhagen } from "@/lib/hours";
import { monthByPlace, monthStartIso } from "@/lib/stats";
import { store } from "@/lib/store";

// Alle ordrer på tværs af steder i én måned, til fakturering. ?format=csv giver et regneark.
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month")! : todayInCopenhagen().slice(0, 7);
  const rows = monthByPlace(await store.orderFacts(new Date(monthStartIso(month)).toISOString()), month);

  if (params.get("format") === "csv") {
    // Semikolon og komma som decimaltegn, så det åbner rigtigt i dansk Excel
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Sted", "Ordrer", "Omsætning (kr.)", "Afviste"], ...rows.map((r) => [r.placeName, r.orders, String(r.revenue).replace(".", ","), r.rejected])];
    return new NextResponse("﻿" + lines.map((l) => l.map(cell).join(";")).join("\r\n"), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="assensnu-ordrer-${month}.csv"` },
    });
  }
  return NextResponse.json({ month, rows });
}
