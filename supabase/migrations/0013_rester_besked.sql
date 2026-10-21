-- Sidste chance som besked: følgere kan sige ja til besked, når et sted sætter rester til halv pris.
-- Sikker at køre: tilføjer kun en kolonne og sletter intet.
alter table followers add column if not exists leftovers boolean not null default false;
