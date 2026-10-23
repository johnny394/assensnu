"use client";

import { useEffect, useState } from "react";
import { MAX_TAGS, pizzaPlace, tagEmoji, tagsFor, type TagId } from "@/lib/tags";
import type { Order } from "@/lib/types";
import { readStored, writeStored } from "./useStored";
import { useLang } from "./useLang";

const doneKey = (id: string) => `assensnu:bedømt:${id}`;

// Mikro-tags i stedet for stjerner: tryk på det, der passer, når maden er hentet eller leveret
export function OrderTags({ order, cuisines }: { order: Order; cuisines: string[] }) {
  const { t } = useLang();
  const [picked, setPicked] = useState<TagId[]>([]);
  const [state, setState] = useState<"choose" | "sending" | "done" | "error">(order.tags ? "done" : "choose");
  useEffect(() => {
    if (readStored(doneKey(order.id), false)) setState("done");
  }, [order.id]);
  const tags = tagsFor(order, cuisines);
  const pizza = pizzaPlace(order, cuisines);

  async function send() {
    setState("sending");
    const res = await fetch(`/api/orders/${order.id}/tags`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tags: picked }) }).catch(() => null);
    if (!res?.ok) return setState("error");
    writeStored(doneKey(order.id), true);
    setState("done");
  }

  if (state === "done" || order.tags) return <p className="border-2 border-ink bg-surface px-4 py-4 text-lg">{t("Tak! Det kommer med i byens stemning om {navn}.", { navn: order.placeName })}</p>;

  const toggle = (id: TagId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_TAGS ? [...p, id] : p));
  return (
    <div className="border-2 border-ink bg-surface px-4 py-4">
      <p className="font-display text-xl font-semibold">{t("Hvordan var det?")}</p>
      <p className="text-ink-soft">{t("Tryk på op til tre. Ingen stjerner, bare det, der passer.")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => {
          const on = picked.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              aria-pressed={on}
              className={`border-2 px-3 py-2 text-lg transition-colors ${on ? (tag.good ? "border-ink bg-ink font-bold text-paper" : "border-stamp bg-stamp font-bold text-white") : tag.good ? "border-ink bg-paper" : "border-dashed border-ink-soft bg-paper text-ink-soft"}`}
            >
              <span aria-hidden>{tagEmoji(tag, pizza)}</span> {t(tag.label)}
            </button>
          );
        })}
      </div>
      {state === "error" && <p className="mt-2 font-bold text-stamp">{t("Det gik ikke at sende. Prøv igen.")}</p>}
      {picked.length > 0 && (
        <button onClick={send} disabled={state === "sending"} className="mt-3 w-full bg-ink px-5 py-3.5 text-lg font-bold text-paper disabled:opacity-50">
          {state === "sending" ? t("Sender…") : t("Send til {navn}", { navn: order.placeName })}
        </button>
      )}
    </div>
  );
}
