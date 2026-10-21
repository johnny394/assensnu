import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupStart } from "@/components/group/GroupStart";
import { store } from "@/lib/store";
import { pageT } from "@/lib/translate";

export const dynamic = "force-dynamic";

export default async function StartGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const place = await store.getPlace((await params).slug);
  if (!place || !place.member || !place.acceptsOrders) notFound();
  const t = await pageT();
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <Link href={`/sted/${place.slug}`} className="inline-block py-2 text-lg text-ink-soft">
        {t("‹ Tilbage til menuen")}
      </Link>
      <h1 className="mt-2 font-display text-[2.3rem] font-black leading-tight tracking-tight">{t("Fællesbestilling")}</h1>
      <p className="text-lg text-ink-soft">{t("Hos {navn}", { navn: place.name })}</p>
      <ol className="mt-6 space-y-3 text-lg">
        {[
          "Du starter og får et link.",
          "Du sender linket til de andre, fx på arbejdet.",
          "Hver person vælger selv sin mad og skriver sit navn.",
          "Du sender det hele som én bestilling. Køkkenet kan se, hvem der skal have hvad.",
        ].map((text, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-bold text-paper">{i + 1}</span>
            <span className="pt-0.5">{t(text)}</span>
          </li>
        ))}
      </ol>
      <GroupStart slug={place.slug} />
    </main>
  );
}
