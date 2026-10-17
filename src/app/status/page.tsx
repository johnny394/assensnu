import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const metadata = { title: "Opsætning · AssensNu", robots: { index: false } };

type Check = { ok: boolean; text: string; fix?: string };

// Tjekker opsætningen og siger på almindeligt dansk, hvad der mangler. Viser aldrig selve nøglerne.
async function runChecks(): Promise<Check[]> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const checks: Check[] = [];

  if (!url || !key) {
    checks.push({
      ok: false,
      text: `Vercel mangler ${[!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean).join(" og ")}.`,
      fix: "Tilføj dem under Settings og Environment Variables på Vercel, og tryk Redeploy bagefter.",
    });
    return checks;
  }

  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
    checks.push({
      ok: false,
      text: `SUPABASE_URL ser forkert ud. Den starter med "${url.slice(0, 30)}…".`,
      fix: "Den skal se præcis sådan ud: https://abcdefghij.supabase.co (dine egne bogstaver, intet efter .co).",
    });
    return checks;
  }
  checks.push({ ok: true, text: "SUPABASE_URL ser rigtig ud." });

  const role = keyRole(key);
  if (role === "anon" || role === "publishable") {
    checks.push({
      ok: false,
      text: "SUPABASE_SERVICE_ROLE_KEY er den offentlige nøgle, ikke den hemmelige.",
      fix: 'Brug nøglen der hedder "secret" (eller "service_role" under Legacy) i Supabase.',
    });
    return checks;
  }
  checks.push({ ok: true, text: "Nøglen er en hemmelig nøgle." });

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { count, error } = await db.from("places").select("slug", { count: "exact", head: true });
    if (error) {
      const msg = `${error.code ?? ""} ${error.message ?? ""}`;
      if (/PGRST205|42P01|does not exist|schema cache/i.test(msg)) {
        checks.push({ ok: false, text: "Databasen er tom: tabellerne findes ikke.", fix: "Kør database-alt-i-en.sql i Supabase under SQL Editor." });
      } else if (/invalid api key|jwt|401|unauthorized/i.test(msg)) {
        checks.push({ ok: false, text: "Supabase afviser nøglen.", fix: "Kopiér den hemmelige nøgle igen, uden mellemrum, og tryk Redeploy på Vercel." });
      } else if (/column/i.test(msg)) {
        checks.push({ ok: false, text: "Databasen har en gammel opbygning.", fix: "Kør database-alt-i-en.sql i Supabase under SQL Editor. Den rydder selv op først." });
      } else {
        checks.push({ ok: false, text: `Supabase svarede med en fejl: ${msg.trim() || "ukendt"}` });
      }
      return checks;
    }
    if (!count) {
      checks.push({ ok: false, text: "Databasen virker, men der er ingen spisesteder.", fix: "Kør database-alt-i-en.sql i Supabase under SQL Editor." });
      return checks;
    }
    checks.push({ ok: true, text: `Databasen virker og har ${count} spisesteder.` });
  } catch (e) {
    checks.push({ ok: false, text: `Kunne ikke nå Supabase: ${e instanceof Error ? e.message : "ukendt fejl"}`, fix: "Tjek at SUPABASE_URL er rigtig." });
    return checks;
  }

  checks.push(
    process.env.PANEL_SECRET
      ? { ok: true, text: "PANEL_SECRET er sat." }
      : { ok: false, text: "PANEL_SECRET mangler.", fix: "Tilføj en lang tilfældig tekst som PANEL_SECRET på Vercel." },
  );
  return checks;
}

function keyRole(key: string) {
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role as string;
  } catch {
    return "ukendt";
  }
}

export default async function StatusPage() {
  const checks = await runChecks();
  const allOk = checks.every((c) => c.ok);
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{allOk ? "Alt er sat rigtigt op" : "Der mangler noget"}</h1>
      <ul className="mt-6 space-y-3">
        {checks.map((c) => (
          <li key={c.text} className={`rounded-2xl px-4 py-3 text-lg ${c.ok ? "bg-go-soft" : "bg-signal-soft"}`}>
            <p className="font-bold">
              {c.ok ? "✓" : "✗"} {c.text}
            </p>
            {c.fix && <p className="mt-1">{c.fix}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
