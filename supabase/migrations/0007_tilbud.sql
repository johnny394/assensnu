-- Normalpris på dagens tilbud, som vises overstreget ved siden af tilbudsprisen. Tom = vises ikke.
-- Sikker at køre: tilføjer kun en kolonne og sletter intet.
alter table places add column if not exists news_was_price integer;
