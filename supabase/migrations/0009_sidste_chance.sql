-- Sidste chance før lukketid. Sikker at køre: tilføjer kun én kolonne og sletter intet.
-- last_chance: de retter, der er til halv pris, og hvornår det slutter, fx {"itemIds": [...], "until": "2026-10-20T19:00:00Z"}
alter table places add column if not exists last_chance jsonb;
