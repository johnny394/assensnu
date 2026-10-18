"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { copenhagenNow, toTime } from "@/lib/hours";
import { useNow } from "./useNow";

const tabs = [
  { href: "/", label: "Mad" },
  { href: "/events", label: "Events" },
  { href: "/favoritter", label: "Favoritter" },
];

const dateline = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", weekday: "long", day: "numeric", month: "long" });

export function Wordmark() {
  return (
    <Link href="/" className="font-display text-2xl font-black tracking-tight text-ink">
      AssensNu
    </Link>
  );
}

// Fælles ramme: avishoved øverst og menu i bunden, som i en app
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const now = useNow();
  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/sted") : path.startsWith(href));

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="mx-auto max-w-2xl px-5 pt-5">
        <Link href="/" className="block text-center font-display text-[2.1rem] font-black leading-none tracking-tight text-ink">
          AssensNu
        </Link>
        <div className="mt-3 h-[7px] border-y border-t-[3px] border-ink" aria-hidden />
        <p className="flex min-h-9 items-center justify-between border-b border-ink text-sm uppercase tracking-[0.12em]">
          {now && (
            <>
              <span>{dateline.format(now)}</span>
              <span>Kl. {toTime(copenhagenNow(now).minutes)}</span>
            </>
          )}
        </p>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-double border-ink bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-2xl grid-cols-3">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active(t.href) ? "page" : undefined}
                className={`flex justify-center py-4 font-display text-[1.15rem] ${
                  active(t.href) ? "font-black text-ink underline decoration-stamp decoration-[3px] underline-offset-[6px]" : "text-ink-soft"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
