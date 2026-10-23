"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminEvents } from "@/components/admin/AdminEvents";
import type { AssensEvent } from "@/lib/events";

// Stedets egne koncerter, quizaftener og markeder. Med Event eller Fuld pakke.
export function PanelEvents({ venue }: { venue: string }) {
  const [events, setEvents] = useState<AssensEvent[] | null>(null);
  const load = useCallback(async () => {
    const res = await fetch("/api/panel/events").catch(() => null);
    const data = (await res?.json().catch(() => null)) as { events?: AssensEvent[] } | null;
    setEvents(data?.events ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (!events) return null;
  return <AdminEvents events={events} api="/api/panel/events" venue={venue} onSaved={load} />;
}
