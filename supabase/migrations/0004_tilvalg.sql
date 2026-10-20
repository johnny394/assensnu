-- Størrelser og tilvalg pr. menukategori, fx {"sizes":[{"name":"Alm.","extra":0},{"name":"Fam.","extra":100}],"extras":[{"name":"Bacon","price":11}]}
-- Sikker at køre: tilføjer kun en kolonne og sletter intet.
alter table menu_categories add column if not exists options jsonb;
