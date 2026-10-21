"use client";

import { useEffect, useState } from "react";
import { kr } from "@/lib/format";
import type { Week } from "@/lib/stats";

type Stats = { weeks: Week[]; followers: number; top: { name: string; quantity: number }[] };

const MONTHS = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
const short = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

// "+3 fra sidste uge" eller "2 færre end sidste uge"
function change(now: number, before: number, unit = (n: number) => String(n)) {
  if (now === before) return "Samme som sidste uge";
  return now > before ? `${unit(now - before)} mere end sidste uge` : `${unit(before - now)} mindre end sidste uge`;
}

// Det, AssensNu har givet stedet. Hentes, når fanen åbnes.
export function StatsTab({ visible }: { visible: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!visible) return;
    fetch("/api/panel/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStats, () => setFailed(true));
  }, [visible]);

  if (failed) return <p className="rounded-3xl bg-surface p-5 text-lg">Tallene kunne ikke hentes. Prøv igen om lidt.</p>;
  if (!stats) return <p className="rounded-3xl bg-surface p-5 text-lg text-ink-soft">Henter tallene …</p>;
  const [week, last] = stats.weeks;
  const best = Math.max(1, ...stats.weeks.map((w) => w.revenue));

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-surface p-5">
        <p className="text-lg font-bold">Denne uge gennem AssensNu</p>
        <p className="text-ink-soft">Fra mandag {short(week.start)} til nu</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Figure label="Ordrer" value={String(week.orders)} note={change(week.orders, last.orders)} />
          <Figure label="Omsætning" value={kr(week.revenue)} note={change(week.revenue, last.revenue, kr)} />
          <Figure label="Bordforespørgsler" value={String(week.bookings)} note={week.guests ? `${week.guests} gæster` : ""} />
          <Figure label="Følgere" value={String(stats.followers)} note={week.newFollowers ? `${week.newFollowers} nye i denne uge` : ""} />
        </div>
      </div>

      {stats.top.length > 0 && (
        <div className="rounded-3xl bg-surface p-5">
          <p className="text-lg font-bold">Mest bestilt i denne uge</p>
          <ol className="mt-2 space-y-1 text-lg">
            {stats.top.map((d, i) => (
              <li key={d.name} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
                <span>{i + 1}. {d.name}</span>
                <span className="font-bold tabular-nums">{d.quantity} stk.</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-3xl bg-surface p-5">
        <p className="text-lg font-bold">Uge for uge</p>
        <table className="mt-2 w-full text-lg">
          <thead>
            <tr className="text-left text-ink-soft">
              <th className="py-1 font-normal">Uge fra</th>
              <th className="py-1 text-right font-normal">Ordrer</th>
              <th className="py-1 text-right font-normal">Omsætning</th>
            </tr>
          </thead>
          <tbody>
            {stats.weeks.map((w) => (
              <tr key={w.start} className="border-t border-line">
                <td className="py-2">{short(w.start)}</td>
                <td className="py-2 text-right tabular-nums">{w.orders}</td>
                <td className="py-2 text-right tabular-nums">
                  <span className="mr-2 inline-block h-3 rounded-full bg-go/70 align-middle" style={{ width: `${Math.round((w.revenue / best) * 60)}px` }} aria-hidden />
                  {kr(w.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-ink-soft">Afviste ordrer tæller ikke med.</p>
      </div>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="text-ink-soft">{label}</p>
      <p className="font-display text-3xl font-extrabold tabular-nums">{value}</p>
      {note && <p className="text-ink-soft">{note}</p>}
    </div>
  );
}
