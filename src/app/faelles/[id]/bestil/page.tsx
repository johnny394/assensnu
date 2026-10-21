import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { PlaceLang } from "@/components/PlaceLang";
import { groupIsOpen, groupLines } from "@/lib/groups";
import { store } from "@/lib/store";
import { pageT } from "@/lib/translate";

export const dynamic = "force-dynamic";

// Den, der startede fællesbestillingen, sender den herfra. Serveren tjekker koden, når den sendes.
export default async function SendGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const group = await store.getGroup((await params).id);
  const place = group ? await store.getPlace(group.placeSlug) : null;
  if (!group || !place || !place.member || !place.acceptsOrders) notFound();
  if (!groupIsOpen(group)) redirect(`/faelles/${group.id}`);
  const people = group.entries.length;
  const t = await pageT();
  return (
    <PlaceLang place={place}>
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <Link href={`/faelles/${group.id}`} className="inline-block py-2 text-lg text-ink-soft">
        {t("‹ Tilbage til fællesbestillingen")}
      </Link>
      <h1 className="mt-2 font-display text-[2.3rem] font-black leading-tight tracking-tight">{t("Send fællesbestillingen")}</h1>
      <p className="text-lg text-ink-soft">
        {t(people === 1 ? "Takeaway fra {navn} til 1 person" : "Takeaway fra {navn} til {n} personer", { navn: place.name, n: people })}
      </p>
      <Checkout place={place} group={{ id: group.id, lines: groupLines(place, group) }} />
    </main>
    </PlaceLang>
  );
}
