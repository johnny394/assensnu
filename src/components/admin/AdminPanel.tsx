"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/AppShell";
import { DeliveryEditor, HoursEditor, MenuEditor, Sheet } from "@/components/panel/DetailsEditors";
import { Toggle } from "@/components/panel/Panel";
import type { AdminPlace } from "@/lib/admin";
import type { AssensEvent } from "@/lib/events";
import { AdminEvents } from "./AdminEvents";
import { AdminOrders } from "./AdminOrders";
import { AdminSigns } from "./AdminSigns";
import { WEEKDAYS } from "@/lib/hours";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string; pin?: string; slug?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return res?.ok ? { ok: true, ...data } : { ok: false, error: data?.error ?? "Ingen forbindelse. Prøv igen." };
}

export function AdminLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await post("/api/admin/login", { code });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error!);
  }

  return (
    <form onSubmit={login} className="mx-auto max-w-sm space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-lg font-bold">Din kode</span>
        <input type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-lg" />
      </label>
      {error && <p role="alert" className="text-lg text-signal">{error}</p>}
      <button disabled={busy || !code} className="min-h-14 w-full rounded-2xl bg-buoy px-5 text-xl font-bold disabled:opacity-60">
        {busy ? "Logger ind…" : "Log ind"}
      </button>
    </form>
  );
}

// Johnnys overblik over alle spisesteder
export function AdminPanel({ places, events }: { places: AdminPlace[]; events: AssensEvent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | "new" | null>(null);
  const selected = places.find((p) => p.slug === open);

  const withCode = places.filter((p) => p.hasCode).length;
  const ordering = places.filter((p) => p.acceptsOrders).length;

  async function logout() {
    await post("/api/admin/logout", {});
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <div className="flex items-center justify-between">
        <Wordmark />
        <button onClick={logout} className="py-2 text-lg text-ink-soft underline">Log ud</button>
      </div>
      <h1 className="mt-6 font-display text-[2.3rem] font-extrabold leading-tight tracking-tight">Dit panel</h1>
      <p className="text-lg text-ink-soft">
        {places.length} spisesteder · {withCode} kan logge ind · {ordering} tager imod bestillinger
      </p>

      <button onClick={() => setOpen("new")} className="mt-6 min-h-14 w-full rounded-2xl bg-buoy px-5 text-xl font-bold">
        + Nyt spisested
      </button>

      <ul className="mt-6 space-y-3">
        {places.map((p) => (
          <li key={p.slug}>
            <button onClick={() => setOpen(p.slug)} className="w-full rounded-2xl border-2 border-ink bg-surface px-4 py-3 text-left">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-bold">{p.name}</span>
                <span className="shrink-0 text-ink-soft">Ret ›</span>
              </span>
              <span className="block text-ink-soft">{p.address}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {!p.published && <Badge tone="dark">Skjult</Badge>}
                {p.hasCode ? <Badge tone="go">Har kode</Badge> : <Badge tone="warn">Mangler kode</Badge>}
                {p.acceptsOrders && <Badge tone="go">Bestilling</Badge>}
                {p.acceptsBookings && <Badge tone="go">Bordbooking</Badge>}
                {p.menu.length === 0 && <Badge tone="soft">Ingen menu</Badge>}
                {p.hours.length === 0 && <Badge tone="soft">Ingen åbningstider</Badge>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <AdminOrders />
      <AdminEvents events={events} />
      <AdminSigns places={places.filter((p) => p.published)} />

      {open === "new" && (
        <BasicsSheet
          title="Nyt spisested"
          onClose={() => setOpen(null)}
          onSaved={(slug) => {
            router.refresh();
            setOpen(slug ?? null);
          }}
        />
      )}
      {selected && <PlaceSheet place={selected} onClose={() => setOpen(null)} />}
    </main>
  );
}

function Badge({ tone, children }: { tone: "go" | "warn" | "soft" | "dark"; children: React.ReactNode }) {
  const style = { go: "bg-go-soft text-go", warn: "bg-buoy text-ink", soft: "bg-line/60 text-ink-soft", dark: "bg-ink text-paper" }[tone];
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${style}`}>{children}</span>;
}

const YES_NO: { label: string; value: boolean | null }[] = [
  { label: "Ja", value: true },
  { label: "Nej", value: false },
  { label: "Ved ikke", value: null },
];

function BasicsFields({ form, setForm }: { form: Basics; setForm: (f: Basics) => void }) {
  const field = "w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg";
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-lg font-bold">Navn</span>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-lg font-bold">Adresse</span>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Østergade 12, 5610 Assens" className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-lg font-bold">Telefon</span>
        <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="12 34 56 78" className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-lg font-bold">Madtyper</span>
        <input value={form.cuisines} onChange={(e) => setForm({ ...form, cuisines: e.target.value })} placeholder="Pizza, Kebab" className={field} />
        <span className="mt-1 block text-ink-soft">Skriv komma imellem. De bruges til filterknapperne på forsiden.</span>
      </label>
      {(["takeaway", "dineIn"] as const).map((key) => (
        <fieldset key={key}>
          <legend className="mb-1 text-lg font-bold">{key === "takeaway" ? "Takeaway" : "Siddepladser"}</legend>
          <div className="grid grid-cols-3 gap-2">
            {YES_NO.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setForm({ ...form, [key]: o.value })}
                aria-pressed={form[key] === o.value}
                className={`min-h-12 rounded-2xl border-2 text-lg font-bold ${form[key] === o.value ? "border-ink bg-ink text-paper" : "border-line bg-surface"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

type Basics = { name: string; address: string; phone: string; cuisines: string; takeaway: boolean | null; dineIn: boolean | null };

const toBasics = (p?: AdminPlace): Basics => ({
  name: p?.name ?? "",
  address: p?.address ?? "",
  phone: p?.phone ?? "",
  cuisines: p?.cuisines.join(", ") ?? "",
  takeaway: p?.takeaway ?? null,
  dineIn: p?.dineIn ?? null,
});

function BasicsSheet({ title, onClose, onSaved }: { title: string; onClose: () => void; onSaved: (slug?: string) => void }) {
  const [form, setForm] = useState<Basics>(toBasics());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await post("/api/admin/places", form);
    setSaving(false);
    if (res.ok) onSaved(res.slug);
    else setError(res.error!);
  }

  return (
    <Sheet title={title} onClose={onClose} onSave={save} saving={saving} error={error}>
      <BasicsFields form={form} setForm={setForm} />
      <p className="mt-6 text-ink-soft">Bagefter kan du give stedet en kode, så de selv kan skrive åbningstider og menukort ind.</p>
    </Sheet>
  );
}

function PlaceSheet({ place, onClose }: { place: AdminPlace; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<Basics>(() => toBasics(place));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [editHours, setEditHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [editMenu, setEditMenu] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const [editDelivery, setEditDelivery] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const url = `/api/admin/places/${place.slug}`;
  const [openingPanel, setOpeningPanel] = useState(false);

  // Logger ind i stedets restaurantpanel uden deres kode og åbner det i en ny fane
  async function openPanel() {
    setOpeningPanel(true);
    const tab = window.open("", "_blank");
    const res = await post(`${url}/panel`, {});
    setOpeningPanel(false);
    if (!res.ok) {
      tab?.close();
      setError(res.error ?? "Panelet kunne ikke åbnes.");
      return;
    }
    if (tab) tab.location.href = "/panel";
    else window.location.href = "/panel";
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await post(url, { basics: form });
    setSaving(false);
    if (!res.ok) return setError(res.error!);
    router.refresh();
    onClose();
  }

  async function toggle(key: "published" | "acceptsOrders" | "acceptsBookings") {
    setError(null);
    const res = await post(url, { [key]: !place[key] });
    if (res.ok) router.refresh();
    else setError(res.error!);
  }

  async function makeCode() {
    setConfirmNew(false);
    setError(null);
    const res = await post(url, { newCode: true });
    if (!res.ok) return setError(res.error!);
    setPin(res.pin!);
    router.refresh();
  }

  async function remove() {
    setError(null);
    const res = await post(`${url}/delete`, {});
    if (!res.ok) return setError(res.error!);
    onClose();
    router.refresh();
  }

  return (
    <Sheet title={place.name} onClose={onClose} onSave={save} saving={saving} error={error}>
      <button onClick={openPanel} disabled={openingPanel} className="mb-4 min-h-14 w-full rounded-2xl bg-ink px-5 text-lg font-bold text-white disabled:opacity-60">
        {openingPanel ? "Åbner …" : "Åbn deres restaurantpanel"}
      </button>
      <section className="rounded-3xl border-2 border-ink bg-surface px-5 py-5">
        <h3 className="font-display text-xl font-black tracking-tight">Kode til restaurantpanelet</h3>
        {pin ? (
          <>
            <p className="mt-3 font-display text-6xl font-black tracking-[0.2em] tabular-nums">{pin}</p>
            <p className="mt-3 text-lg">Skriv koden ned og giv den til {place.name}. Den vises kun nu.</p>
            <p className="mt-2 text-lg">De logger ind på {window.location.host}/panel, vælger {place.name} og taster koden.</p>
          </>
        ) : confirmNew ? (
          <>
            <p className="mt-2 text-lg">Den gamle kode holder op med at virke, og restauranten skal logge ind igen med den nye.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={makeCode} className="min-h-12 rounded-2xl bg-buoy text-lg font-bold">Ja, lav ny kode</button>
              <button onClick={() => setConfirmNew(false)} className="min-h-12 rounded-2xl border-2 border-line text-lg">Fortryd</button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg">{place.hasCode ? "Stedet har en kode og kan logge ind." : "Stedet har ingen kode endnu og kan ikke logge ind."}</p>
            <button onClick={() => (place.hasCode ? setConfirmNew(true) : makeCode())} className="mt-3 min-h-12 w-full rounded-2xl bg-buoy px-5 text-lg font-bold">
              {place.hasCode ? "Lav en ny kode" : "Lav en kode"}
            </button>
          </>
        )}
      </section>

      <section className="mt-5 rounded-3xl border-2 border-line px-5 py-2">
        <Toggle label="Tag imod bestillinger" hint="Kunderne kan bestille takeaway her" on={place.acceptsOrders} onClick={() => toggle("acceptsOrders")} />
        <Toggle label="Tag imod bordforespørgsler" on={place.acceptsBookings} onClick={() => toggle("acceptsBookings")} />
        <Toggle label="Vis på AssensNu" hint="Slået fra er stedet skjult for kunderne" on={place.published} onClick={() => toggle("published")} />
      </section>
      <section className="mt-5 rounded-3xl border-2 border-line px-5 py-4">
        <h3 className="font-display text-xl font-black tracking-tight">Åbningstider</h3>
        {hoursSaved && <p role="status" className="mt-1 font-bold text-go">Gemt. Kunderne kan se det nu.</p>}
        {place.hours.length === 0 ? (
          <p className="mt-2 text-lg">Ingen åbningstider endnu. Kunderne ser ikke, om stedet har åbent.</p>
        ) : (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 text-lg tabular-nums">
            {WEEKDAYS.map((name, d) => {
              const periods = place.hours.filter((h) => h.day === d);
              return (
                <div key={name} className="contents">
                  <dt className="font-bold">{name}</dt>
                  <dd className={periods.length ? "" : "text-ink-soft"}>
                    {periods.length ? periods.map((h) => `${h.open}–${h.close}`).join(" og ") : "Lukket"}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        <button onClick={() => setEditHours(true)} className="mt-3 min-h-12 w-full rounded-2xl border-2 border-ink px-5 text-lg font-bold">
          {place.hours.length ? "Ret åbningstider" : "Skriv åbningstider"}
        </button>
      </section>
      <section className="mt-5 rounded-3xl border-2 border-line px-5 py-4">
        <h3 className="font-display text-xl font-black tracking-tight">Menukort</h3>
        {menuSaved && <p role="status" className="mt-1 font-bold text-go">Gemt. Kunderne kan se det nu.</p>}
        <p className="mt-2 text-lg">
          {place.menu.length === 0
            ? "Intet menukort endnu."
            : place.menu.map((c) => `${c.name} (${c.items.length})`).join(", ")}
        </p>
        <button onClick={() => setEditMenu(true)} className="mt-3 min-h-12 w-full rounded-2xl border-2 border-ink px-5 text-lg font-bold">
          {place.menu.length ? "Ret menukort" : "Skriv menukort"}
        </button>
      </section>

      <section className="mt-5 rounded-3xl border-2 border-line px-5 py-4">
        <h3 className="font-display text-xl font-black tracking-tight">Levering</h3>
        {deliverySaved && <p role="status" className="mt-1 font-bold text-go">Gemt. Kunderne kan se det nu.</p>}
        <p className="mt-2 text-lg">
          {place.delivery
            ? [`${place.delivery.fee} kr.`, `mindst ${place.delivery.minimum} kr.`, place.delivery.postcodes.join(", "), place.delivery.harbour && "også havnen"].filter(Boolean).join(" · ")
            : "Leverer ikke."}
        </p>
        <button onClick={() => setEditDelivery(true)} className="mt-3 min-h-12 w-full rounded-2xl border-2 border-ink px-5 text-lg font-bold">
          Ret levering
        </button>
      </section>

      <h3 className="mb-3 mt-8 font-display text-xl font-black tracking-tight">Oplysninger</h3>
      <BasicsFields form={form} setForm={setForm} />
      <Link href={`/sted/${place.slug}`} target="_blank" className="mt-6 block text-lg underline">
        Se stedets side
      </Link>

      <section className="mt-10 border-t border-line pt-6">
        {confirmDelete ? (
          <div className="rounded-3xl border-2 border-stamp bg-stamp-soft px-5 py-5">
            <p className="text-lg font-bold">Slet {place.name} for altid?</p>
            <p className="mt-2 text-lg">
              Stedet forsvinder fra AssensNu sammen med åbningstider, menukort og gamle bestillinger. Det kan ikke fortrydes.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={remove} className="min-h-12 rounded-2xl bg-stamp text-lg font-bold text-white">Ja, slet</button>
              <button onClick={() => setConfirmDelete(false)} className="min-h-12 rounded-2xl border-2 border-line bg-paper text-lg">Fortryd</button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setConfirmDelete(true)} className="min-h-12 w-full rounded-2xl border-2 border-stamp px-5 text-lg font-bold text-stamp">
              Slet spisested
            </button>
            <p className="mt-2 px-1 text-ink-soft">Kun hvis stedet er lukket for altid. Holder det bare lukket en periode, så slå &quot;Vis på AssensNu&quot; fra.</p>
          </>
        )}
      </section>
      {editDelivery && (
        <DeliveryEditor
          place={place}
          saveUrl={`${url}/details`}
          onClose={() => setEditDelivery(false)}
          onSaved={() => {
            setEditDelivery(false);
            setDeliverySaved(true);
            router.refresh();
          }}
        />
      )}
      {editMenu && (
        <MenuEditor
          place={place}
          saveUrl={`${url}/details`}
          onClose={() => setEditMenu(false)}
          onSaved={() => {
            setEditMenu(false);
            setMenuSaved(true);
            router.refresh();
          }}
        />
      )}
      {editHours && (
        <HoursEditor
          place={place}
          withPhone={false}
          saveUrl={`${url}/details`}
          onClose={() => setEditHours(false)}
          onSaved={() => {
            setEditHours(false);
            setHoursSaved(true);
            router.refresh();
          }}
        />
      )}
    </Sheet>
  );
}
