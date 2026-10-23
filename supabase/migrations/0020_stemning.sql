-- Mikro-tags på ordrer og byens stemning på 2 linjer for hvert sted. Tilføjer kun to kolonner.
alter table orders add column if not exists tags jsonb;
alter table places add column if not exists vibe jsonb;
