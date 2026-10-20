-- Pris på dagens ret, så kunderne kan bestille den. Tom = kun en tekst.
-- Sikker at køre: tilføjer kun en kolonne og sletter intet.
alter table places add column if not exists news_price integer;
