-- Mød kokken. Sikker at køre: tilføjer kun to kolonner og sletter intet.
-- chef: hvem står bag og et par linjer, fx {"name": "Ali og Sara", "text": "...", "photoAt": "2026-10-21T09:00:00Z"}
-- chef_photo: billedet, gjort lille på telefonen før det sendes
alter table places add column if not exists chef jsonb;
alter table places add column if not exists chef_photo text;
