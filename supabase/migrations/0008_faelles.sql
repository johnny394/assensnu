-- Fællesbestilling. Sikker at køre: tilføjer kun to tabeller og sletter intet.
-- Én starter en fællesbestilling og deler linket. Hver person lægger sin egen mad i.
create table if not exists group_orders (
  id uuid primary key default gen_random_uuid(),
  place_slug text not null references places on delete cascade on update cascade,
  host_name text not null,
  host_hash text not null, -- fingeraftryk af den kode, kun den der startede har
  order_id uuid, -- sat, når bestillingen er sendt
  created_at timestamptz not null default now()
);
alter table group_orders enable row level security;

create table if not exists group_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references group_orders on delete cascade,
  name text not null,
  items jsonb not null, -- [{itemId, quantity, size, extras}]
  entry_hash text not null, -- så hver person selv kan fjerne sin mad igen
  created_at timestamptz not null default now()
);
alter table group_entries enable row level security;
