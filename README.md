# AssensNu

Alle spisesteder i Assens samlet ét sted: se hvem der har åbent, find menuen, ring, bestil takeaway og book bord. Senere også events og festivaler.

Mål: første version i luften 1. december 2026.

## Kom i gang

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # tests af åbningstider
```

Uden Supabase bruger siden startlisten i `src/data/places.ts`. Med Supabase:

1. Opret et projekt på supabase.com og kør `supabase/migrations/0001_init.sql`.
2. Kopiér `.env.example` til `.env.local` og udfyld URL og anon-nøgle.

## Struktur

| Sti | Indhold |
| --- | --- |
| `src/app/page.tsx` | Forside med søgning og filtre |
| `src/app/sted/[slug]` | Side for hvert spisested |
| `src/lib/hours.ts` | "Åben nu" i dansk tid, også over midnat |
| `src/lib/places.ts` | Henter fra Supabase eller startlisten |
| `supabase/migrations` | Database: steder, åbningstider, menuer, ordrer, bookinger |

## Plan

1. Fundament (17.–26. okt): projekt, database, design
2. Find og se (27. okt–9. nov): restaurantsider, menuer, søgning, åben nu
3. Bestil og book (10.–23. nov): takeaway, bordbooking, restaurantpanel
4. Test og klargøring (24.–30. nov)
