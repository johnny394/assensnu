"use client";

import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import type { PlaceMonth } from "@/lib/stats";

const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const monthName = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

// De sidste seks måneder, nyeste først
function lastMonths(today = new Date()) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

// Alle ordrer på tværs af steder, så du kan se, hvad hvert sted skal faktureres for
export function AdminOrders() {
  const months = lastMonths();
  const [month, setMonth] = useState(months[0]);
  const [rows, setRows] = useState<PlaceMonth[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setRows(null);
    setFailed(false);
    fetch(`/api/admin/orders?month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRows(d.rows), () => setFailed(true));
  }, [month]);
  const total = rows?.reduce((s, r) => ({ orders: s.orders + r.orders, revenue: s.revenue + r.revenue }), { orders: 0, revenue: 0 });

  return (
    <section className="mt-10">
      <h2 className="font-display text-[1.8rem] font-extrabold tracking-tight">Ordrer på alle steder</h2>
      <p className="text-lg text-ink-soft">Til fakturering. Afviste ordrer tæller ikke med i omsætningen.</p>
      <select value={month} onChange={(e) => setMonth(e.target.value)} className="mt-4 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg">
        {months.map((m) => (
          <option key={m} value={m}>{monthName(m)}</option>
        ))}
      </select>
      {failed && <p className="mt-3 font-bold text-signal">Tallene kunne ikke hentes. Prøv igen.</p>}
      {!rows && !failed && <p className="mt-3 text-lg text-ink-soft">Henter …</p>}
      {rows && rows.length === 0 && <p className="mt-3 text-lg">Ingen ordrer i {monthName(month)}.</p>}
      {rows && rows.length > 0 && (
        <>
          <table className="mt-3 w-full text-lg">
            <thead>
              <tr className="text-left text-ink-soft">
                <th className="py-1 font-normal">Sted</th>
                <th className="py-1 text-right font-normal">Ordrer</th>
                <th className="py-1 text-right font-normal">Omsætning</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.placeSlug} className="border-t border-line">
                  <td className="py-2">
                    {r.placeName}
                    {r.rejected > 0 && <span className="block text-base text-ink-soft">{r.rejected} afvist</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.orders}</td>
                  <td className="py-2 text-right tabular-nums">{kr(r.revenue)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink font-bold">
                <td className="py-2">I alt</td>
                <td className="py-2 text-right tabular-nums">{total!.orders}</td>
                <td className="py-2 text-right tabular-nums">{kr(total!.revenue)}</td>
              </tr>
            </tbody>
          </table>
          <a href={`/api/admin/orders?month=${month}&format=csv`} className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-ink px-5 text-xl font-bold">
            Hent som regneark
          </a>
        </>
      )}
    </section>
  );
}
