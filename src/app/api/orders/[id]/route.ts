import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const order = await store.getOrder((await params).id);
  return order ? NextResponse.json(order) : NextResponse.json({ error: "Bestillingen findes ikke." }, { status: 404 });
}
