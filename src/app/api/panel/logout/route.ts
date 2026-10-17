import { NextResponse } from "next/server";
import { logoutPanel } from "@/lib/panel-auth";

export async function POST() {
  await logoutPanel();
  return NextResponse.json({ ok: true });
}
