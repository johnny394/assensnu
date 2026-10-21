-- Lukkedage på forhånd: juleaften, vinterferie og den slags. Sikker at køre: tilføjer kun en kolonne og sletter intet.
alter table places add column if not exists closed_days jsonb;
