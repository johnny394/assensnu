import { createClient } from "@supabase/supabase-js";
import { company, companyComplete } from "@/lib/company";
import webpush from "web-push";
import { supabaseOrigin } from "@/lib/store/url";
import { CITY, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: `Opsætning · ${SITE}`, robots: { index: false } };

type Check = { ok: boolean; text: string; fix?: string; copy?: { name: string; value: string }[] };

// Tjekker opsætningen og siger på almindeligt dansk, hvad der mangler. Viser aldrig de nøgler, der er i brug.
async function runChecks(): Promise<Check[]> {
  const url = supabaseOrigin(process.env.SUPABASE_URL);
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
      text: `SUPABASE_URL ser forkert ud: "${url.replace(/^https:\/\/[a-z0-9]{6}[a-z0-9]*/, (m) => m.slice(0, 14) + "…")}".`,
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
    const started = Date.now();
    const { count, error } = await db.from("places").select("slug", { count: "exact", head: true });
    const ms = Date.now() - started;
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
    checks.push(
      ms < 300
        ? { ok: true, text: `Databasen svarer på ${ms} ms (server: ${process.env.VERCEL_REGION ?? "lokal"}).` }
        : {
            ok: false,
            text: `Databasen svarer langsomt: ${ms} ms (server: ${process.env.VERCEL_REGION ?? "lokal"}).`,
            fix: "Genindlæs siden. Er det stadig over 300 ms, ligger databasen langt fra serveren. Skriv tallet til Claude.",
          },
    );
  } catch (e) {
    checks.push({ ok: false, text: `Kunne ikke nå Supabase: ${e instanceof Error ? e.message : "ukendt fejl"}`, fix: "Tjek at SUPABASE_URL er rigtig." });
    return checks;
  }

  checks.push(
    process.env.PANEL_SECRET
      ? { ok: true, text: "PANEL_SECRET er sat." }
      : { ok: false, text: "PANEL_SECRET mangler.", fix: "Tilføj en lang tilfældig tekst som PANEL_SECRET på Vercel." },
  );

  checks.push(
    (process.env.ADMIN_KODE?.trim().length ?? 0) >= 8
      ? { ok: true, text: "ADMIN_KODE er sat, så du kan logge ind på /admin." }
      : process.env.ADMIN_KODE
        ? { ok: false, text: "ADMIN_KODE er for kort.", fix: "Brug mindst 8 tegn, så den ikke kan gættes. Ret den på Vercel og tryk Redeploy." }
        : { ok: false, text: "ADMIN_KODE mangler, så du kan ikke logge ind på /admin.", fix: "Tilføj en kode på mindst 8 tegn som ADMIN_KODE på Vercel, og tryk Redeploy." },
  );

  // Kolonnen til beskeder kom til efter første udgave af databasen
  const { error } = await createClient(url, key, { auth: { persistSession: false } }).from("orders").select("push").limit(1);
  checks.push(
    error
      ? { ok: false, text: "Databasen kan ikke gemme beskeder til kunderne endnu.", fix: "Kør tilfoej-beskeder.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Databasen kan gemme beskeder til kunderne." },
  );

  const levering = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("delivery").limit(1);
  checks.push(
    levering.error
      ? { ok: false, text: "Databasen kan ikke gemme levering endnu.", fix: "Kør tilfoej-levering.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Databasen kan gemme levering." },
  );

  const tilvalg = await createClient(url, key, { auth: { persistSession: false } }).from("menu_categories").select("options").limit(1);
  checks.push(
    tilvalg.error
      ? { ok: false, text: "Databasen kan ikke gemme størrelser og tilvalg endnu.", fix: "Kør tilfoej-tilvalg.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Databasen kan gemme størrelser og tilvalg." },
  );

  const folg = await createClient(url, key, { auth: { persistSession: false } }).from("followers").select("endpoint").limit(1);
  const nyt = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("busy_until, news, news_at").limit(1);
  checks.push(
    folg.error || nyt.error
      ? { ok: false, text: "Databasen kan ikke gemme følgere, dagens tilbud og travlt-tid endnu.", fix: "Kør tilfoej-folg.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Databasen kan gemme følgere, dagens tilbud og travlt-tid." },
  );

  const dagensRet = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("news_price").limit(1);
  checks.push(
    dagensRet.error
      ? { ok: false, text: "Dagens tilbud kan ikke få en pris endnu.", fix: "Kør tilfoej-dagens-ret.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Dagens tilbud kan få en pris og bestilles." },
  );

  const tilbud = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("news_was_price").limit(1);
  checks.push(
    tilbud.error
      ? { ok: false, text: "Dagens tilbud kan ikke vise normalpris endnu.", fix: "Kør tilfoej-tilbud.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Dagens tilbud kan vise normalpris." },
  );

  const sidste = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("last_chance").limit(1);
  checks.push(
    sidste.error
      ? { ok: false, text: "Sidste chance (halv pris før lukketid) kan ikke gemmes endnu.", fix: "Kør tilfoej-sidste-chance.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Sidste chance (halv pris før lukketid) kan gemmes." },
  );

  const faelles = await createClient(url, key, { auth: { persistSession: false } }).from("group_entries").select("id").limit(1);
  checks.push(
    faelles.error
      ? { ok: false, text: "Databasen kan ikke gemme fællesbestillinger endnu.", fix: "Kør tilfoej-faelles.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Databasen kan gemme fællesbestillinger." },
  );

  const oversat = await createClient(url, key, { auth: { persistSession: false } }).from("translations").select("key").limit(1);
  checks.push(
    oversat.error
      ? { ok: false, text: "Databasen kan ikke gemme menuen på engelsk og tysk endnu.", fix: "Kør tilfoej-oversaettelser.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Databasen kan gemme menuen på engelsk og tysk." },
  );

  const kokken = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("chef, chef_photo").limit(1);
  checks.push(
    kokken.error
      ? { ok: false, text: "Mød kokken (billede og tekst) kan ikke gemmes endnu.", fix: "Kør tilfoej-mod-kokken.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Mød kokken (billede og tekst) kan gemmes." },
  );

  const events = await createClient(url, key, { auth: { persistSession: false } }).from("events").select("id").limit(1);
  checks.push(
    events.error
      ? { ok: false, text: "Databasen kan ikke gemme events endnu.", fix: "Kør tilfoej-events.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Databasen kan gemme events." },
  );

  const lukkedage = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("closed_days").limit(1);
  checks.push(
    lukkedage.error
      ? { ok: false, text: "Restauranterne kan ikke sætte lukkedage på forhånd endnu.", fix: "Kør tilfoej-lukkedage.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Restauranterne kan sætte lukkedage på forhånd." },
  );

  const byer = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("town").limit(1);
  checks.push(
    byer.error
      ? { ok: false, text: "Databasen kan ikke holde styr på flere byer endnu.", fix: "Kør tilfoej-byer.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: `Databasen kan holde styr på flere byer. Den her side viser ${CITY}.` },
  );

  const panelBesked = await createClient(url, key, { auth: { persistSession: false } }).from("places").select("panel_push").limit(1);
  checks.push(
    panelBesked.error
      ? { ok: false, text: "Restauranterne kan ikke få besked om ordrer uden svar endnu.", fix: "Kør tilfoej-panel-besked.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Restauranterne kan få besked om ordrer uden svar." },
  );

  const rester = await createClient(url, key, { auth: { persistSession: false } }).from("followers").select("leftovers").limit(1);
  checks.push(
    rester.error
      ? { ok: false, text: "Følgere kan ikke få besked om rester til halv pris endnu.", fix: "Kør tilfoej-rester-besked.sql i Supabase under SQL Editor. Den sletter ingenting." }
      : { ok: true, text: "Følgere kan få besked om rester til halv pris." },
  );
  checks.push(
    process.env.ANTHROPIC_API_KEY?.trim()
      ? { ok: true, text: "ANTHROPIC_API_KEY er sat, så menuen kan oversættes til engelsk og tysk." }
      : {
          ok: false,
          text: "Menuen kan ikke oversættes til engelsk og tysk, fordi ANTHROPIC_API_KEY mangler.",
          fix: "Lav en nøgle på console.anthropic.com under API Keys, og tilføj den som ANTHROPIC_API_KEY på Vercel. Tryk Redeploy bagefter.",
        },
  );

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    checks.push({ ok: true, text: "Nøglerne til beskeder er sat." });
  } else {
    // Et nyt, tilfældigt par hver gang siden vises. Det bruges først, når det står på Vercel.
    const fresh = webpush.generateVAPIDKeys();
    checks.push({
      ok: false,
      text: "Kunderne får ikke besked, når telefonen er låst.",
      fix: "Tilføj de to nøgler herunder på Vercel under Settings og Environment Variables, og tryk Redeploy. Kopiér begge fra samme visning af siden.",
      copy: [
        { name: "VAPID_PUBLIC_KEY", value: fresh.publicKey },
        { name: "VAPID_PRIVATE_KEY", value: fresh.privateKey },
      ],
    });
  }
  {
    const c = company();
    const missing = (["FIRMA_NAVN", "FIRMA_CVR", "FIRMA_ADRESSE", "FIRMA_MAIL"] as const).filter((_, i) => !Object.values(c)[i]);
    checks.push(
      companyComplete()
        ? { ok: true, text: "Firmaoplysningerne står i privatlivspolitik og handelsbetingelser." }
        : {
            ok: false,
            text: `Privatlivspolitik og handelsbetingelser mangler firmaoplysninger: ${missing.join(", ")}.`,
            fix: "Tilføj dem på Vercel under Settings og Environment Variables (navn, CVR-nummer, adresse og mail), og tryk Redeploy.",
          },
    );
  }
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
            {c.copy?.map((k) => (
              <div key={k.name} className="mt-3">
                <p className="font-bold">{k.name}</p>
                <p className="select-all break-all bg-surface px-3 py-2 font-mono text-base">{k.value}</p>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </main>
  );
}
