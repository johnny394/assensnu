"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { field, label } from "../Checkout";
import { joinGroup, saveHostKey } from "../useGroup";
import { useLang } from "../useLang";

const CUSTOMER_KEY = "assensnu:kunde";

export function GroupStart({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLang();
  useEffect(() => {
    try {
      setName(JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}").name ?? "");
    } catch {}
  }, []);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, name }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(t(data?.error ?? "Det gik ikke. Tjek din forbindelse og prøv igen."));
      setBusy(false);
      return;
    }
    saveHostKey(data.id, data.key);
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ ...saved, name }));
    } catch {}
    joinGroup(slug, data.id);
    router.push(`/faelles/${data.id}`);
  }

  return (
    <form onSubmit={start} className="mt-8 space-y-4">
      <div>
        <label htmlFor="name" className={label}>{t("Dit navn")}</label>
        <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        <p className="mt-1 text-ink-soft">{t("Så de andre kan se, hvem der har startet den.")}</p>
      </div>
      {error && <p className="font-bold text-stamp">{error}</p>}
      <button disabled={busy} className="min-h-14 w-full bg-stamp px-5 py-4 text-lg font-bold text-white disabled:opacity-60">
        {t(busy ? "Et øjeblik …" : "Start fællesbestillingen")}
      </button>
    </form>
  );
}
