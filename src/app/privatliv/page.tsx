import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CompanyLine, LegalPage } from "@/components/LegalPage";
import { company } from "@/lib/company";
import { KEEP_DAYS } from "@/lib/privacy";
import { chooseLang, pageT } from "@/lib/translate";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Privatlivspolitik · ${SITE}` };

export default async function PrivacyPage() {
  const c = company();
  return (
    <AppShell>
      <LegalPage title="Privatlivspolitik" updated="22. oktober 2026" lang={await chooseLang()} t={await pageT()}>
        <p>Her står, hvad {SITE} gemmer om dig, hvorfor, og hvor længe. Vi gemmer så lidt som muligt, og vi sælger aldrig dine oplysninger.</p>

        <h2>Hvem er ansvarlig</h2>
        <CompanyLine c={c} />
        <p>Restauranten, du bestiller hos, får dine oplysninger for at kunne lave maden og kontakte dig. Den er selv ansvarlig for, hvad den gør med dem bagefter.</p>

        <h2>Det gemmer vi</h2>
        <ul>
          <li><strong>Når du bestiller mad:</strong> navn, telefonnummer, hvad du bestiller, og din besked til restauranten. Bringer restauranten maden ud, også din adresse.</li>
          <li><strong>Når du beder om et bord:</strong> navn, telefonnummer, dag, tid, antal og din besked.</li>
          <li><strong>Når du siger ja til beskeder:</strong> en adresse til din telefon, så vi kan sende beskeden. Ikke dit nummer.</li>
          <li><strong>Når du følger et sted:</strong> det samme, så stedet kan sende dig dagens tilbud. Du kan stoppe det med ét tryk.</li>
          <li><strong>Når du siger din mening om maden:</strong> de små mærker, du trykker på (fx &quot;Rygende varm&quot;), sammen med bestillingen. De bruges til den korte opsummering øverst på stedets side.</li>
        </ul>
        <p>Vi bruger oplysningerne til at sende din bestilling til restauranten og fortælle dig, hvordan det går. Det er nødvendigt for at opfylde aftalen med dig (databeskyttelsesforordningens artikel 6, stk. 1, litra b). Beskeder og følg sender vi kun, fordi du har sagt ja (litra a).</p>

        <h2>Så længe gemmer vi det</h2>
        <p>Efter {KEEP_DAYS} dage sletter vi navn, telefonnummer, adresse og besked fra bestillinger og bordforespørgsler. Tilbage er kun hvad der blev bestilt og prisen, så restauranten kan se sin omsætning. Fællesbestillinger slettes helt.</p>

        <h2>På din telefon</h2>
        <p>Dit navn og telefonnummer huskes på din egen telefon, så du ikke skal skrive dem igen. Dine favoritter, dit valg af sprog, dine hensyn (fx laktosefri) og en liste over dine seneste bestillinger huskes også der. Listen bruges kun til dine Mester-Spiser-mærker og til at sige hej, hvis det er længe siden. Selve listen sendes ikke til os. Til hilsenen sendes kun stedets navn og din livret, ikke hvem du er. Vi bruger ingen cookies til reklame eller statistik.</p>

        <h2>Hvem hjælper os</h2>
        <ul>
          <li><strong>Vercel</strong> kører hjemmesiden.</li>
          <li><strong>Supabase</strong> gemmer bestillinger og menuer.</li>
          <li><strong>Stripe</strong> tager imod betalingen, hvis du betaler online med MobilePay eller kort. Pengene går til restaurantens egen Stripe-konto. Vi ser aldrig dit kortnummer.</li>
          <li><strong>Anthropic</strong> oversætter restauranternes menuer til engelsk og tysk og står bag Mad-oraklet og allergidetektiven. Der sendes kun menutekster, det du skriver til oraklet, og de hensyn du har valgt (fx laktosefri). Aldrig dit navn, telefonnummer eller din adresse.</li>
        </ul>
        <p>De må kun bruge oplysningerne til at hjælpe os. Nogle af dem har servere uden for EU. Så sker det efter EU&apos;s regler for overførsel, fx EU-Kommissionens standardkontrakter.</p>

        <h2>Dine rettigheder</h2>
        <p>Du kan altid få at vide, hvad vi har gemt om dig, få det rettet eller slettet. Skriv til os{c.email && <> på <a href={`mailto:${c.email}`} className="underline">{c.email}</a></>}, så svarer vi inden for en måned.</p>
        <p>Er du utilfreds med, hvordan vi passer på dine oplysninger, kan du klage til <a href="https://www.datatilsynet.dk" className="underline">Datatilsynet</a>.</p>
      </LegalPage>
    </AppShell>
  );
}
