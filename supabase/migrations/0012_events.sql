-- Events i byen og "Spis før koncerten". Sletter ingenting.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time time not null,
  venue text not null,
  text text,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists events_date on events (date);
alter table events enable row level security;
