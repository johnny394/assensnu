-- Følg dit sted og live ventetid. Sikker at køre: tilføjer kun kolonner og en tabel og sletter intet.
-- busy_until: hvornår "travlt" slukker af sig selv. news + news_at: dagens ret eller tilbud.
alter table places add column if not exists busy_until timestamptz;
alter table places add column if not exists news text;
alter table places add column if not exists news_at timestamptz;

-- Kunder, der følger et sted og vil have besked om dagens ret og tilbud. Én række pr. telefon pr. sted.
create table if not exists followers (
  place_slug text not null references places on delete cascade on update cascade,
  endpoint text not null,
  push jsonb not null,
  created_at timestamptz not null default now(),
  primary key (place_slug, endpoint)
);
alter table followers enable row level security;
