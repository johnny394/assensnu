"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/AppShell";
import { usePolling } from "@/components/usePolling";
import { kr, longDate, telLink } from "@/lib/format";
import { choiceText } from "@/lib/menu-options";
import { townName } from "@/lib/postcodes";
import { copenhagenNow, openStatus, todayInCopenhagen, toTime } from "@/lib/hours";
import { startLater } from "@/lib/later";
import type { Booking, Order, Place } from "@/lib/types";
import { DeliveryEditor, HoursEditor, MenuEditor } from "./DetailsEditors";
import { isClosedOn } from "@/lib/closed-days";
import { ChefBox } from "./ChefBox";
import { PanelPushBox } from "./PanelPushBox";
import { StatsTab } from "./StatsTab";
import { ClosedDaysBox } from "./ClosedDaysBox";
import { LastChanceBox, NewsBox, WaitBar } from "./LiveBoxes";
import { useAlarm } from "./useAlarm";

type Data = { place: Place; orders: Order[]; bookings: Booking[]; followers: number | null };
type Tab = "orders" | "bookings" | "stats" | "settings";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return !!res?.ok;
}

// Restaurantens skærm: nye ordrer og bordforespørgsler øverst, med lyd
export function Panel({ initial, noDatabase, pushKey = null }: { initial: Data; noDatabase?: boolean; pushKey?: string | null }) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const data = usePolling<Data>(`/api/panel?v=${version}`, initial, 4000);
  const refresh = () => setVersion((v) => v + 1);
  const [tab, setTab] = useState<Tab>("orders");
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const newOrders = data.orders.filter((o) => o.status === "new");
  const newBookings = data.bookings.filter((b) => b.status === "requested");
  const waiting = newOrders.length + newBookings.length;
  const { armed, arm } = useAlarm(waiting > 0);

  useEffect(() => {
    document.title = waiting ? `(${waiting}) Nyt i AssensNu` : `${data.place.name} · AssensNu`;
  }, [waiting, data.place.name]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "orders", label: "Ordrer", count: newOrders.length },
    { key: "bookings", label: "Borde", count: newBookings.length },
    { key: "stats", label: "Tal" },
    { key: "settings", label: "Indstillinger" },
  ];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="text-lg font-bold">{data.place.name}</span>
          </div>
          {!data.place.acceptsOrders && <span className="rounded-full bg-signal-soft px-3 py-1 font-bold text-signal">Bestilling er slået fra</span>}
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] lg:hidden">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key} className={`shrink-0 rounded-full px-3 py-2 text-base sm:px-4 sm:text-lg ${tab === t.key ? "bg-ink font-bold text-white" : "bg-surface"}`}>
              {t.label}
              {!!t.count && <span className="ml-2 rounded-full bg-buoy px-2 font-bold text-ink">{t.count}</span>}
            </button>
          ))}
        </nav>
      </header>

      {noDatabase && (
        <p className="bg-signal px-5 py-3 text-center text-lg font-bold text-white">
          Databasen er ikke koblet på, så ordrer kan forsvinde. Se hvad der mangler på <a className="underline" href="/status">opsætningssiden</a>.
        </p>
      )}

      {!armed && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-ink/80 px-6">
          <div className="max-w-sm rounded-3xl bg-surface p-6 text-center">
            <p className="font-display text-2xl font-extrabold tracking-tight">Klar til at tage imod?</p>
            <p className="mt-2 text-lg">Tryk på knappen, så ringer panelet, når der kommer en ny ordre eller bordforespørgsel. Lad skærmen stå tændt.</p>
            <button onClick={arm} className="mt-5 w-full rounded-2xl bg-buoy px-5 py-4 text-xl font-bold">Start vagten</button>
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-5 lg:grid-cols-[1fr_1fr_20rem]">
        <WaitBar place={data.place} onChange={refresh} />
        <section className={tab === "orders" ? "" : "hidden lg:block"}>
          <h2 className="mb-3 hidden font-display text-2xl font-extrabold tracking-tight lg:block">Ordrer</h2>
          <Orders orders={data.orders} waitMinutes={data.place.prepMinutes + data.place.extraWaitMinutes} onChange={refresh} />
        </section>
        <section className={tab === "bookings" ? "" : "hidden lg:block"}>
          <h2 className="mb-3 hidden font-display text-2xl font-extrabold tracking-tight lg:block">Borde</h2>
          <Bookings bookings={data.bookings} onChange={refresh} />
        </section>
        {/* På den store skærm står tallene øverst i højre side, over indstillingerne */}
        <section className={tab === "stats" ? "lg:hidden" : "hidden"}>
          <StatsTab visible={tab === "stats" && !wide} />
        </section>
        <section className={tab === "settings" ? "" : "hidden lg:block"}>
          {wide && (
            <div className="mb-6">
              <h2 className="mb-3 font-display text-2xl font-extrabold tracking-tight">Tal</h2>
              <StatsTab visible />
            </div>
          )}
          <h2 className="mb-3 hidden font-display text-2xl font-extrabold tracking-tight lg:block">Indstillinger</h2>
          <Settings
            place={data.place}
            followers={data.followers}
            pushKey={pushKey}
            onChange={refresh}
            onLogout={async () => {
              await post("/api/panel/logout", {});
              router.refresh();
            }}
          />
        </section>
      </main>
    </div>
  );
}

const big = "min-h-14 whitespace-nowrap rounded-2xl px-2 text-lg font-bold";

function Orders({ orders: fromServer, waitMinutes, onChange }: { orders: Order[]; waitMinutes: number; onChange: () => void }) {
  // Et tryk vises med det samme. Serveren gemmer i baggrunden, og panelet retter sig efter den bagefter.
  const [pending, setPending] = useState<Record<string, { status: Order["status"]; readyAt?: string }>>({});
  const orders = fromServer.map((o) => (pending[o.id] && pending[o.id].status !== o.status ? { ...o, ...pending[o.id] } : o));
  const forget = (id: string) =>
    setPending((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  useEffect(() => {
    // Når serveren har fået den nye status, er der ikke mere at vente på
    for (const o of fromServer) if (pending[o.id]?.status === o.status) forget(o.id);
  }, [fromServer, pending]);
  const active = orders.filter((o) => o.status === "new" || o.status === "accepted" || o.status === "ready");
  // Accepterede ordrer til senere i dag ligger for sig selv, til det er tid at gå i gang
  const nowMinutes = copenhagenNow().minutes;
  const startAt = (o: Order) => startLater(o.pickup, waitMinutes, nowMinutes);
  const later = active.filter((o) => o.status === "accepted" && startAt(o)).sort((a, b) => a.pickup.localeCompare(b.pickup));
  const current = active.filter((o) => !later.includes(o));
  const done = orders.filter((o) => o.status === "picked_up" || o.status === "rejected");
  const set = async (o: Order, status: Order["status"], readyInMinutes?: number) => {
    const readyAt = status !== "accepted" ? o.readyAt : o.pickup !== "asap" ? o.pickup : toTime(copenhagenNow().minutes + (readyInMinutes ?? 0));
    setPending((p) => ({ ...p, [o.id]: { status, readyAt } }));
    if (!(await post(`/api/panel/orders/${o.id}`, { status, readyInMinutes }))) {
      forget(o.id);
      alert("Det gik ikke igennem. Prøv igen.");
      return;
    }
    onChange();
  };

  const card = (o: Order) => (
    <article key={o.id} className={`rounded-3xl bg-surface p-5 ${o.status === "new" ? "border-4 border-buoy shadow-[0_0_24px_2px_rgba(255,200,69,0.5)]" : "border-2 border-line"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl font-extrabold tabular-nums">{o.number}</p>
        <p className="text-lg font-bold">{o.pickup === "asap" ? "Hurtigst muligt" : `${o.delivery ? "Leveres" : "Hentes"} ${o.pickup}`}</p>
      </div>
      {startAt(o) && (
        <p className="mt-2 rounded-xl bg-buoy-soft px-3 py-2 text-lg">
          <strong>TIL SENERE.</strong> Gå i gang kl. {startAt(o)}
        </p>
      )}
      {o.delivery && (
        <p className="mt-2 rounded-xl bg-ink px-3 py-2 text-lg text-paper">
          {o.delivery.harbour ? (
            <><strong>HAVNEN</strong> · {o.delivery.address}</>
          ) : (
            <><strong>LEVERING</strong> til {o.delivery.address}, {townName(o.delivery.postcode)}</>
          )}
        </p>
      )}
      {o.status === "new" && <p className="font-bold text-buoy-deep">NY ORDRE · {toTime(copenhagenNow(new Date(o.createdAt)).minutes)}</p>}
      <ul className="mt-2 text-xl">
        {o.lines.map((l, i) => (
          <li key={i}>
            {/* Fællesbestilling: navnet står over hver persons mad, så den kan pakkes for sig */}
            {l.person && l.person !== o.lines[i - 1]?.person && <p className="mt-2 border-b border-line text-lg font-bold uppercase tracking-[0.08em] text-ink-soft">{l.person}</p>}
            <strong>{l.quantity} ×</strong> {l.name}
            {l.halfPrice && <span className="ml-2 rounded bg-stamp px-1.5 text-base font-bold text-white">½ pris</span>}
            {choiceText(l) && <span className="block pl-8 text-lg font-bold text-ink-soft">{choiceText(l)}</span>}
          </li>
        ))}
      </ul>
      {o.note && <p className="mt-2 rounded-xl bg-buoy-soft px-3 py-2 text-lg">Besked: {o.note}</p>}
      <p className="mt-2 text-lg text-ink-soft">
        {o.customerName} · <a className="underline" href={telLink(o.customerPhone)}>{o.customerPhone}</a> · {kr(o.total)}
        {o.delivery && ` (heraf levering ${kr(o.delivery.fee)})`}
      </p>

      {o.status === "new" && (
        <div className="mt-4">
          {o.pickup === "asap" ? (
            <>
              <button onClick={() => set(o, "accepted", waitMinutes)} className={`${big} w-full bg-go text-white`}>
                Accepter · klar om {waitMinutes} min
              </button>
              <p className="mb-2 mt-3 text-ink-soft">Eller vælg en anden tid:</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[15, 20, 30, 45].map((m) => (
                  <button key={m} onClick={() => set(o, "accepted", m)} className={`${big} border-2 border-go text-go`}>
                    {m} min
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button onClick={() => set(o, "accepted")} className={`${big} w-full bg-go text-white`}>
              Accepter · klar kl. {o.pickup}
            </button>
          )}
          <button onClick={() => confirm(`Afvis ordre ${o.number}?`) && set(o, "rejected")} className="mt-2 w-full py-2 text-lg text-signal underline">
            Afvis ordren
          </button>
        </div>
      )}
      {o.status === "accepted" && (
        <button onClick={() => set(o, "ready")} className={`${big} mt-4 w-full bg-buoy text-ink`}>
          {o.delivery ? "Maden kører ud nu" : "Maden er klar"}{o.readyAt && <span className="font-normal"> (lovet {o.readyAt})</span>}
        </button>
      )}
      {o.status === "ready" && (
        <button onClick={() => set(o, "picked_up")} className={`${big} mt-4 w-full border-2 border-ink`}>
          {o.delivery ? "Maden er leveret" : "Kunden har hentet"}
        </button>
      )}
        </article>
  );

  if (orders.length === 0) return <Empty text="Ingen ordrer endnu i dag. Panelet ringer, når der kommer en." />;

  return (
    <div className="space-y-3">
      {current.map(card)}
      {later.length > 0 && (
        <>
          <h3 className="pt-3 font-display text-xl font-extrabold tracking-tight">Til senere i dag ({later.length})</h3>
          {later.map(card)}
        </>
      )}
      {done.length > 0 && (
        <details className="rounded-3xl bg-surface px-5 py-3 text-lg">
          <summary className="cursor-pointer py-1 font-bold">Tidligere i dag ({done.length})</summary>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {done.map((o) => (
              <li key={o.id}>
                {o.number} · {o.customerName} · {kr(o.total)} · {o.status === "rejected" ? "afvist" : o.delivery ? "leveret" : "hentet"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Bookings({ bookings, onChange }: { bookings: Booking[]; onChange: () => void }) {
  const [suggestFor, setSuggestFor] = useState<string | null>(null);
  const answer = async (b: Booking, status: Booking["status"], suggestedTime?: string) => {
    await post(`/api/panel/bookings/${b.id}`, { status, suggestedTime });
    setSuggestFor(null);
    onChange();
  };
  const shift = (time: string, minutes: number) => {
    const [h, m] = time.split(":").map(Number);
    return toTime(h * 60 + m + minutes);
  };

  if (bookings.length === 0) return <Empty text="Ingen bordforespørgsler endnu." />;

  const label = { requested: "", confirmed: "Bekræftet", declined: "Sagt nej", suggested: "Foreslået anden tid" };

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <article key={b.id} className={`rounded-3xl bg-surface p-5 ${b.status === "requested" ? "border-4 border-buoy" : "border-2 border-line"}`}>
          {b.status === "requested" && <p className="font-bold text-buoy-deep">NY FORESPØRGSEL</p>}
          <p className="font-display text-2xl font-extrabold tracking-tight first-letter:uppercase">
            {longDate(b.date)} kl. {b.time}
          </p>
          <p className="text-xl">
            <strong>{b.guests}</strong> {b.guests === 1 ? "person" : "personer"} · {b.customerName}
          </p>
          <p className="text-lg text-ink-soft">
            <a className="underline" href={telLink(b.customerPhone)}>{b.customerPhone}</a>
          </p>
          {b.note && <p className="mt-2 rounded-xl bg-buoy-soft px-3 py-2 text-lg">{b.note}</p>}

          {b.status === "requested" ? (
            suggestFor === b.id ? (
              <div className="mt-4">
                <p className="mb-2 font-bold">Hvilket tidspunkt kan I tilbyde?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[-60, -30, 30, 60].map((m) => (
                    <button key={m} onClick={() => answer(b, "suggested", shift(b.time, m))} className={`${big} border-2 border-ink tabular-nums`}>
                      {shift(b.time, m)}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSuggestFor(null)} className="mt-2 w-full py-2 text-lg underline">Fortryd</button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={() => answer(b, "confirmed")} className={`${big} bg-go text-white`}>Ja</button>
                <button onClick={() => setSuggestFor(b.id)} className={`${big} border-2 border-ink`}>Andet tid</button>
                <button onClick={() => answer(b, "declined")} className={`${big} bg-signal-soft text-signal`}>Nej</button>
              </div>
            )
          ) : (
            <p className="mt-2 font-bold">
              {label[b.status]}
              {b.status === "suggested" && ` (kl. ${b.suggestedTime})`}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function Settings({ place: fromServer, followers, pushKey, onChange, onLogout }: { place: Place; followers: number | null; pushKey: string | null; onChange: () => void; onLogout: () => void }) {
  // Valget vises med det samme; serveren gemmer i baggrunden
  const [place, setPlace] = useState(fromServer);
  const [editing, setEditing] = useState<"hours" | "menu" | "delivery" | null>(null);
  const [saved, setSaved] = useState(false);
  const saving = useRef(0);
  useEffect(() => {
    if (saving.current === 0) setPlace(fromServer);
  }, [fromServer]);
  const save = async (settings: object, show: (p: Place) => Place) => {
    setPlace(show);
    saving.current++;
    const ok = await post("/api/panel/settings", settings);
    saving.current--;
    if (!ok) alert("Det gik ikke igennem. Prøv igen.");
    onChange();
  };

  return (
    <div className="space-y-3">
      <PanelPushBox publicKey={pushKey} />
      <NewsBox place={fromServer} followers={followers} onChange={onChange} />
      <LastChanceBox place={fromServer} open={openStatus(fromServer).state === "open"} onChange={onChange} />
      <div className="rounded-3xl bg-surface px-5 py-4">
        <p className="text-lg font-bold">Det, kunderne ser</p>
        {saved && <p role="status" className="mt-1 font-bold text-go">Gemt. Kunderne kan se det nu.</p>}
        <div className="mt-3 space-y-2">
          <EditButton label="Telefon og åbningstider" missing={!place.phone || place.hours.length === 0} onClick={() => setEditing("hours")} />
          <EditButton label="Menukort" missing={place.menu.length === 0} onClick={() => setEditing("menu")} />
          <EditButton label={place.delivery ? `Levering · ${kr(place.delivery.fee)}` : "Levering · slået fra"} missing={false} onClick={() => setEditing("delivery")} />
        </div>
      </div>
      {editing && (() => {
        const Editor = editing === "hours" ? HoursEditor : editing === "menu" ? MenuEditor : DeliveryEditor;
        return (
          <Editor
            place={fromServer}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setSaved(true);
              setTimeout(() => setSaved(false), 6000);
              onChange();
            }}
          />
        );
      })()}
      <ChefBox place={fromServer} onChange={onChange} />

      <div className="rounded-3xl bg-surface px-5 py-2">
        <Toggle label="Tag imod bestillinger" on={place.acceptsOrders} onClick={() => save({ acceptsOrders: !place.acceptsOrders }, (p) => ({ ...p, acceptsOrders: !p.acceptsOrders }))} />
        <Toggle label="Lukket i dag" hint={isClosedOn(place.closedDays, todayInCopenhagen()) ? "I dag er en lukkedag, I har sat herunder" : "Vises som lukket indtil i morgen"} on={!!place.closedToday} onClick={() => save({ closedToday: !place.closedToday }, (p) => ({ ...p, closedToday: !p.closedToday }))} />
      </div>
      <ClosedDaysBox place={fromServer} onChange={onChange} />

      {place.menu.length > 0 && (
        <div className="rounded-3xl bg-surface px-5 py-2">
          <p className="pt-2 text-lg font-bold">Udsolgt i dag</p>
          {place.menu.flatMap((c) => c.items).map((item) => (
            <Toggle key={item.id} label={item.name} on={!!item.soldOut} onClick={() =>
                save({ soldOut: { itemId: item.id, soldOut: !item.soldOut } }, (p) => ({
                  ...p,
                  menu: p.menu.map((c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, soldOut: !i.soldOut } : i)) })),
                }))
              } />
          ))}
        </div>
      )}

      <p className="px-2 text-ink-soft">Brug for hjælp? Ring til AssensNu, så hjælper vi.</p>
      <button onClick={onLogout} className="w-full py-3 text-lg text-ink-soft underline">Log ud</button>
    </div>
  );
}

function EditButton({ label, missing, onClick }: { label: string; missing: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 border-ink px-4 text-left text-lg font-bold">
      <span>{label}</span>
      <span className={`shrink-0 text-base ${missing ? "rounded-full bg-buoy px-3 py-0.5 text-ink" : "font-normal text-ink-soft"}`}>{missing ? "Mangler" : "Ret ›"}</span>
    </button>
  );
}

export function Toggle({ label, hint, on, onClick }: { label: string; hint?: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} className="flex w-full items-center justify-between gap-4 border-b border-line py-3 text-left last:border-b-0">
      <span>
        <span className="block text-lg">{label}</span>
        {hint && <span className="text-ink-soft">{hint}</span>}
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-go" : "bg-line"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
      </span>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-3xl border-2 border-dashed border-line px-5 py-8 text-center text-lg text-ink-soft">{text}</p>;
}
