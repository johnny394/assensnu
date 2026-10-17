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
    <Link href="/" className="inline-flex items-center gap-1.5 font-display text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
      Assens
      <span className="relative -rotate-2 rounded-[0.55rem] bg-buoy px-2 pb-0.5 pt-px text-ink shadow-[0_0_14px_0_rgba(247,197,72,0.55)]">Nu</span>
    </Link>
  );
}

// Fælles ramme: logo øverst og en svævende menu i bunden, som i en app
export function AppShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const path = usePathname();
  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/sted") : path.startsWith(href));

  return (
    <div className="min-h-dvh pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <a href="#indhold" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-40 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Gå til indhold
      </a>
      <header className={`mx-auto flex items-center px-5 pt-5 sm:px-8 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        <Wordmark />
      </header>
      <div id="indhold">{children}</div>
      <nav aria-label="Hovedmenu" className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <ul className="mx-auto grid max-w-sm grid-cols-3 gap-1 rounded-[1.6rem] bg-ink/95 p-1.5 shadow-float backdrop-blur-md">
          {tabs.map((t) => {
            const on = active(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 rounded-[1.2rem] py-2 text-[0.82rem] ${
                    on ? "bg-white/[0.13] font-bold text-buoy" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-[1.4rem] w-[1.4rem]" fill="none" stroke="currentColor" strokeWidth={on ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
