import { NextResponse } from "next/server";
import { adminCode, checkAdminCode, loginAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!adminCode()) return NextResponse.json({ error: "Der er ingen kode endnu. Sæt ADMIN_KODE på Vercel og tryk Redeploy." }, { status: 503 });
  const { code } = (await request.json().catch(() => ({}))) as { code?: unknown };
  if (typeof code !== "string" || !checkAdminCode(code)) {
    // Lidt ventetid gør det langsomt at gætte koden
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Koden passer ikke." }, { status: 401 });
  }
  await loginAdmin();
  return NextResponse.json({ ok: true });
}
