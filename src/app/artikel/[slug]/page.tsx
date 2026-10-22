import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BynuMasthead } from "@/components/BynuMasthead";
import { ARTICLES, CONTACT, article, type Block } from "@/lib/articles";
import { BRAND } from "@/lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => ARTICLES.map((a) => ({ slug: a.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = article((await params).slug);
  return a ? { title: `${a.title} · ${BRAND}`, description: a.lead } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = article((await params).slug);
  if (!a) notFound();
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 pb-16 pt-5">
      <BynuMasthead />
      <article className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-stamp">{a.kicker}</p>
        <h1 className="mt-1 font-display text-[2.3rem] font-black leading-[1.05]">{a.title}</h1>
        <p className="mt-3 text-xl italic leading-snug">{a.lead}</p>
        <div className="mt-6 space-y-5 border-t border-ink pt-5 text-lg leading-relaxed">
          {a.body.map((b, i) => <BlockView key={i} b={b} />)}
        </div>
      </article>
      <Link href="/" className="mt-10 inline-block font-bold underline">‹ Tilbage til forsiden</Link>
    </main>
  );
}

function BlockView({ b }: { b: Block }) {
  if ("p" in b) return <p>{b.p}</p>;
  if ("tip" in b) return <p className="border-l-4 border-stamp pl-4"><strong>Tip:</strong> {b.tip}</p>;
  if ("contact" in b)
    return (
      <div className="border-2 border-ink bg-surface px-4 py-4">
        <p className="font-display text-xl font-semibold">Vil du være med?</p>
        <p className="mt-1">Skriv eller ring, så sætter vi dit sted op og giver dig en kode til panelet.</p>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-bold">
          <a href={`mailto:${CONTACT.email}`} className="underline">{CONTACT.email}</a>
          <a href={`tel:${CONTACT.tel}`} className="underline">Ring {CONTACT.phone}</a>
        </p>
      </div>
    );
  return (
    <ul className="divide-y divide-ink/30 border-y border-ink/30">
      {b.list.map((item) => (
        <li key={item.title} className="py-3">
          <strong className="block font-display text-xl">{item.title}</strong>
          {item.text}
        </li>
      ))}
    </ul>
  );
}
