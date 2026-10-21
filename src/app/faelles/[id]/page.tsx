import { notFound } from "next/navigation";
import { GroupBoard } from "@/components/group/GroupBoard";
import { PlaceLang } from "@/components/PlaceLang";
import { groupView } from "@/lib/groups";
import { store } from "@/lib/store";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = { title: `Fællesbestilling · ${SITE}` };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const group = await store.getGroup((await params).id);
  const place = group ? await store.getPlace(group.placeSlug) : null;
  if (!group || !place) notFound();
  return (
    <PlaceLang place={place}>
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
        <GroupBoard place={place} initial={groupView(place, group)} />
      </main>
    </PlaceLang>
  );
}
