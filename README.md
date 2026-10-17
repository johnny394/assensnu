# AssensNu

Alle spisesteder i Assens samlet ét sted: se hvem der har åbent, find menuen, ring, bestil takeaway og book bord. Senere også events og festivaler.

Mål: første version i luften 1. december 2026.

## Kom i gang

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # tests af åbningstider, afhentningstider og bestillinger
```

Uden Supabase kører siden i afprøvningstilstand: spisestederne kommer fra `src/data/places.ts`, og ordrer og bookinger gemmes kun i hukommelsen. Prøv "Prøvepizza (demo)" og restaurantpanelet på `/panel` med koden 1234.

Til drift:

1. Opret et projekt på supabase.com og kør `supabase/migrations/0001_init.sql`.
2. Kopiér `.env.example` til `.env.local` og udfyld `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` og `PANEL_SECRET`.
3. Giv hver restaurant en kode: gem `sha256(kode)` i `places.panel_pin_hash`.

## Sådan hænger det sammen

Kun serveren taler med databasen. Browseren henter status igen hvert 4.-5. sekund, så der er ingen websockets eller sms.

| Sti | Indhold |
| --- | --- |
| `src/app/page.tsx` | Forside: hvem har åbent, søgning og filtre |
| `src/app/sted/[slug]` | Restaurantside med menu og kurv, `bestil` og `book` |
| `src/app/ordre/[id]`, `src/app/booking/[id]` | Kundens statusside, opdaterer sig selv |
| `src/app/panel` | Restaurantpanel til mobil og tablet, login med kode |
| `src/app/api` | Opret ordre/booking, panelets handlinger |
| `src/lib/hours.ts` | "Åben nu" og afhentningstider i dansk tid |
| `src/lib/orders.ts` | Tjek af bestillinger; prisen regnes altid ud fra menuen |
| `src/lib/store` | Gemmer data: `memory.ts` (afprøvning) eller `supabase.ts` (drift) |

## Design

Bæltblå tekst, fjordhvid baggrund og bøjegul til det, der er åbent eller kan trykkes på. Det gule ÅBEN-skilt er sidens kendetegn. Skrifter: Schibsted Grotesk til overskrifter og Atkinson Hyperlegible til tekst, valgt fordi den er let at læse for alle. Grundstørrelsen er 17 px, og knapper er mindst 48 px høje.
