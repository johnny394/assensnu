import { notFound } from "next/navigation";
import { GroupBoard } from "@/components/group/GroupBoard";
import { groupView } from "@/lib/groups";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fællesbestilling · AssensNu" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const group = await store.getGroup((await params).id);
  const place = group ? await store.getPlace(group.placeSlug) : null;
  if (!group || !place) notFound();
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <GroupBoard place={place} initial={groupView(place, group)} />
    </main>
  );
}
