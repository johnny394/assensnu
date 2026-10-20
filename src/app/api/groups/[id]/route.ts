import { NextResponse } from "next/server";
import { cleanGroupItems, cleanGroupName, GROUP_MAX_PEOPLE, groupIsOpen, groupView } from "@/lib/groups";
import { store } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

async function load(params: Params["params"]) {
  const group = await store.getGroup((await params).id);
  const place = group ? await store.getPlace(group.placeSlug) : null;
  return group && place ? { group, place } : null;
}

// Hvem har lagt hvad i. Siden spørger igen med få sekunders mellemrum.
export async function GET(_request: Request, { params }: Params) {
  const found = await load(params);
  if (!found) return NextResponse.json({ error: "Fællesbestillingen findes ikke." }, { status: 404 });
  return NextResponse.json(groupView(found.place, found.group));
}

// Læg sin egen mad i
export async function POST(request: Request, { params }: Params) {
  const found = await load(params);
  if (!found) return NextResponse.json({ error: "Fællesbestillingen findes ikke." }, { status: 404 });
  const { group, place } = found;
  if (!groupIsOpen(group)) return NextResponse.json({ error: "Bestillingen er allerede sendt." }, { status: 400 });
  if (group.entries.length >= GROUP_MAX_PEOPLE) return NextResponse.json({ error: `Der kan højst være ${GROUP_MAX_PEOPLE} med.` }, { status: 400 });
  const body = await request.json().catch(() => null);
  const name = cleanGroupName(body?.name);
  if (!name) return NextResponse.json({ error: "Skriv dit navn, så køkkenet ved, hvem maden er til." }, { status: 400 });
  const items = cleanGroupItems(place, body?.items);
  if (!items.ok) return NextResponse.json({ error: items.error }, { status: 400 });
  const key = crypto.randomUUID();
  const entry = await store.addGroupEntry(group.id, name, items.value, key);
  return NextResponse.json({ entryId: entry.id, key });
}

// Fjern sin mad igen. Den, der startede, kan fjerne alles.
export async function DELETE(request: Request, { params }: Params) {
  const found = await load(params);
  if (!found) return NextResponse.json({ error: "Fællesbestillingen findes ikke." }, { status: 404 });
  if (!groupIsOpen(found.group)) return NextResponse.json({ error: "Bestillingen er allerede sendt." }, { status: 400 });
  const body = await request.json().catch(() => null);
  const ok = await store.removeGroupEntry(found.group.id, String(body?.entryId ?? ""), String(body?.key ?? ""));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Det kan kun den, der lagde maden i." }, { status: 403 });
}
