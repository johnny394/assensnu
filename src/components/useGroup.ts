"use client";

import { useEffect, useState } from "react";

// Fællesbestillingen huskes på telefonen: hvilken man er med i hos hvert sted,
// koden hvis man selv har startet den, og koderne til den mad, man selv har lagt i.
const activeKey = (slug: string) => `assensnu:faelles:${slug}`;
const HOST = "assensnu:faelles-vaert";
const MINE = "assensnu:faelles-mine";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function joinGroup(slug: string, id: string) {
  write(activeKey(slug), id);
}

export function leaveGroup(slug: string, id: string) {
  if (read<string | null>(activeKey(slug), null) === id) write(activeKey(slug), null);
}

export function saveHostKey(id: string, key: string) {
  write(HOST, { ...read<Record<string, string>>(HOST, {}), [id]: key });
}

export function hostKey(id: string): string | null {
  return read<Record<string, string>>(HOST, {})[id] ?? null;
}

export function saveEntryKey(entryId: string, key: string) {
  write(MINE, { ...read<Record<string, string>>(MINE, {}), [entryId]: key });
}

export function entryKeys(): Record<string, string> {
  return read<Record<string, string>>(MINE, {});
}

// Den fællesbestilling, man er med i hos dette sted, eller null
export function useActiveGroup(slug: string): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(read<string | null>(activeKey(slug), null)), [slug]);
  return id;
}
