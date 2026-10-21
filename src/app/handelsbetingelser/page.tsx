import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CompanyLine, LegalPage } from "@/components/LegalPage";
import { company } from "@/lib/company";
import { chooseLang, pageT } from "@/lib/translate";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Handelsbetingelser · ${SITE}` };

export default async function TermsPage() {
  const c = company();
  return (
    <AppShell>
      <LegalPage title="Handelsbetingelser" updated="21. oktober 2026" lang={await chooseLang()} t={await pageT()}>
        <p>{SITE} er byens side for mad. Vi sender din bestilling videre til restauranten. Det er restauranten, der laver maden og sælger den til dig.</p>

        <h2>Hvem er hvem</h2>
        <p>{SITE} drives af:</p>
        <CompanyLine c={c} />
        <p>Sælgeren er den restaurant, du bestiller hos. Restaurantens navn, adresse og telefon står på dens side.</p>

        <h2>Sådan bestiller du</h2>
        <ul>
          <li>Du lægger mad i kurven, skriver navn og telefon og trykker send.</li>
          <li>Aftalen er først indgået, når restauranten har accepteret bestillingen. Det kan du se på siden, du kommer til.</li>
          <li>Afviser restauranten, er der ingen aftale, og du skal ikke betale noget.</li>
        </ul>

        <h2>Priser og betaling</h2>
        <p>Alle priser er i danske kroner med moms. Du betaler restauranten, når du henter maden, eller ved døren, hvis den bringes ud. Levering koster det gebyr, der står i kassen, før du sender.</p>

        <h2>Fortrydelse</h2>
        <p>Der er ikke fortrydelsesret på mad, der laves til dig til et bestemt tidspunkt (forbrugeraftalelovens § 18, stk. 2). Vil du ændre eller aflyse en bestilling, så ring til restauranten hurtigst muligt.</p>

        <h2>Bordforespørgsler</h2>
        <p>En bordforespørgsel er ikke en bestilling. Bordet er først dit, når restauranten har sagt ja. Kan du ikke komme, så ring og sig det.</p>

        <h2>Allergener</h2>
        <p>Har du en allergi, så ring til restauranten og spørg, før du bestiller. Restauranten kan fortælle, hvad der er i maden.</p>

        <h2>Klager</h2>
        <p>Er der noget galt med maden, så kontakt restauranten med det samme. Er der noget galt med {SITE}, så skriv til os{c.email && <> på <a href={`mailto:${c.email}`} className="underline">{c.email}</a></>}. Kan I ikke blive enige, kan du klage til <a href="https://naevneneshus.dk" className="underline">Nævnenes Hus</a>.</p>
      </LegalPage>
    </AppShell>
  );
}
