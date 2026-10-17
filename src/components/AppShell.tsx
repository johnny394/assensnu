"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const tabs = [
  { href: "/", label: "Mad", icon: "M7 3v8a2 2 0 0 0 2 2v8M11 3v6M5 3v6M17 21V3c-2 1-3 4-3 8h3" },
  { href: "/events", label: "Events", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { href: "/favoritter", label: "Favoritter", icon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" },
];

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-1 font-display text-xl font-extrabold tracking-tight text-ink">
      Assens
      <span className="rounded-md bg-buoy px-1.5 py-0.5 text-ink shadow-[0_0_10px_1px_rgba(255,200,69,0.5)]">Nu</span>
    </Link>
  );
}

// Fælles ramme: logo øverst og menu i bunden, som i en app
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/sted") : path.startsWith(href));

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="mx-auto flex max-w-2xl items-center px-5 pt-5">
        <Wordmark />
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-2xl grid-cols-3">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active(t.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-sm ${active(t.href) ? "font-bold text-ink" : "text-ink-soft"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active(t.href) ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
