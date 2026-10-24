import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { isAdmin } from "@/lib/admin-auth";
import { askJson, canUseAI, tooMany } from "@/lib/ai";
import { cleanRead, isPhotoType, MAX_PHOTOS, MAX_UPLOAD_CHARS, READ_SCHEMA, READ_SYSTEM } from "@/lib/menu-photo";
import { panelSlug } from "@/lib/panel-auth";

// Restauranten (eller Johnny i /admin) sender billeder af menukortet og får et forslag tilbage.
// Intet gemmes her. Forslaget vises i menukort-skærmen, hvor de retter og trykker Gem.

export const maxDuration = 300;

// Et helt menukort er en stor opgave, og priserne skal være rigtige, så her bruges en klogere model end de små AI-funktioner
const MODEL = "claude-sonnet-5-5";

export async function POST(req: Request) {
  const who = (await panelSlug()) ?? ((await isAdmin()) ? "admin" : null);
  if (!who) return NextResponse.json({ error: "Log ind igen." }, { status: 401 });
  if (!canUseAI()) return NextResponse.json({ error: "Billeder af menukortet kan ikke læses lige nu. Skriv retterne ind herunder." }, { status: 503 });
  if (tooMany(`menufoto:${who}`, 4)) return NextResponse.json({ error: "Vent et minut, og prøv igen." }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { files?: { type?: unknown; data?: unknown }[] } | null;
  const files = Array.isArray(body?.files) ? body.files : [];
  const size = files.reduce((n, f) => n + (typeof f?.data === "string" ? f.data.length : 0), 0);
  if (!files.length || files.length > MAX_PHOTOS || size > MAX_UPLOAD_CHARS || files.some((f) => !isPhotoType(f?.type) || typeof f?.data !== "string" || !f.data)) {
    return NextResponse.json({ error: `Vælg op til ${MAX_PHOTOS} billeder af menukortet.` }, { status: 400 });
  }

  const content: Anthropic.ContentBlockParam[] = files.map((f) =>
    f.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data as string } }
      : { type: "image", source: { type: "base64", media_type: f.type as "image/jpeg", data: f.data as string } },
  );
  content.push({ type: "text", text: files.length > 1 ? `Her er menukortet på ${files.length} billeder.` : "Her er menukortet." });

  try {
    const answer = cleanRead(await askJson(READ_SYSTEM, content, READ_SCHEMA, 16_000, { model: MODEL, timeout: 240_000 }));
    if (!answer.categories.length) return NextResponse.json({ error: answer.note || "Vi kunne ikke læse et menukort på billedet. Prøv et skarpere billede tæt på." }, { status: 422 });
    return NextResponse.json(answer);
  } catch {
    return NextResponse.json({ error: "Det gik ikke at læse billedet. Prøv igen om lidt." }, { status: 502 });
  }
}
