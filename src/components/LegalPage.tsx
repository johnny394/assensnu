import Link from "next/link";
import type { T } from "@/lib/i18n";

// Ramme til privatlivspolitik og handelsbetingelser. Selve teksten står på dansk.
export function LegalPage({ title, updated, lang, t, children }: { title: string; updated: string; lang: string; t: T; children: React.ReactNode }) {
  return (
    <main lang="da" className="mx-auto max-w-2xl px-5 pb-16 pt-6 text-lg leading-relaxed">
      <h1 className="font-display text-[2.3rem] font-black leading-tight tracking-tight">{title}</h1>
      <p className="text-ink-soft">Senest ændret {updated}</p>
      {lang !== "da" && <p lang={lang} className="mt-3 border-2 border-dashed border-ink-soft/60 px-4 py-3 text-ink-soft">{t("Denne side findes kun på dansk.")}</p>}
      <div className="mt-6 space-y-4 [&_h2]:mt-8 [&_h2]:border-t-[3px] [&_h2]:border-double [&_h2]:border-ink [&_h2]:pt-2.5 [&_h2]:font-display [&_h2]:text-[1.5rem] [&_h2]:font-black [&_h2]:tracking-tight [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
      <p className="mt-10 flex gap-5 text-ink-soft">
        <Link href="/privatliv" className="underline">Privatlivspolitik</Link>
        <Link href="/handelsbetingelser" className="underline">Handelsbetingelser</Link>
      </p>
    </main>
  );
}

export function CompanyLine({ c }: { c: { name: string | null; cvr: string | null; address: string | null; email: string | null } }) {
  return (
    <p>
      {c.name ?? "AssensNu"}
      {c.cvr && <>, CVR {c.cvr}</>}
      {c.address && <>, {c.address}</>}
      {c.email && (
        <>
          . Mail: <a href={`mailto:${c.email}`} className="underline">{c.email}</a>
        </>
      )}
      .
    </p>
  );
}
