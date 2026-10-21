-- Besked til restaurantens telefon, når en ordre ikke er besvaret efter 3 minutter.
-- Sikker at køre: tilføjer kun en kolonne og sletter intet.
alter table places add column if not exists panel_push jsonb;
