-- Menuen på engelsk og tysk. Sikker at køre: tilføjer kun én tabel og sletter intet.
-- Hver tekst oversættes kun én gang og gemmes her. key er et fingeraftryk af sprog og dansk tekst.
create table if not exists translations (
  key text primary key,
  lang text not null,
  source text not null, -- den danske tekst, som restauranten har skrevet
  text text not null, -- oversættelsen
  created_at timestamptz not null default now()
);
alter table translations enable row level security;
