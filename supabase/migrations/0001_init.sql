-- AssensNu: spisesteder, åbningstider, menuer, takeaway-ordrer og bordforespørgsler.
-- Kun serveren taler med databasen (med service role-nøglen), så der er ingen
-- adgang for browseren og ingen RLS-regler at holde styr på.

create table places (
  slug text primary key,
  name text not null,
  cuisines text[] not null default '{}',
  address text not null,
  phone text,
  website text,
  facebook text,
  description text,
  takeaway boolean,
  dine_in boolean,
  accepts_orders boolean not null default false,
  accepts_bookings boolean not null default false,
  prep_minutes int not null default 20,
  extra_wait_minutes int not null default 0,
  closed_on date, -- sat til dagens dato, når restauranten trykker "lukket i dag"
  panel_pin_hash text, -- sha256 af restaurantens kode til panelet
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- day: 0 = mandag ... 6 = søndag. close <= open betyder åbent over midnat.
create table opening_hours (
  id bigint generated always as identity primary key,
  place_slug text not null references places on delete cascade on update cascade,
  day smallint not null check (day between 0 and 6),
  open time not null,
  close time not null
);

create table menu_categories (
  id bigint generated always as identity primary key,
  place_slug text not null references places on delete cascade on update cascade,
  name text not null,
  position int not null default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id bigint not null references menu_categories on delete cascade,
  name text not null,
  description text,
  price_kr numeric(8, 2) not null,
  sold_out boolean not null default false,
  position int not null default 0
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 101),
  place_slug text not null references places on update cascade,
  place_name text not null,
  customer_name text not null,
  customer_phone text not null,
  pickup text not null, -- 'asap' eller 'HH:MM'
  note text,
  lines jsonb not null, -- [{itemId, name, price, quantity}] kopieret fra menuen
  total_kr numeric(10, 2) not null,
  status text not null default 'new' check (status in ('new', 'accepted', 'ready', 'picked_up', 'rejected')),
  ready_at text,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  place_slug text not null references places on update cascade,
  place_name text not null,
  customer_name text not null,
  customer_phone text not null,
  date date not null,
  time text not null,
  guests int not null check (guests between 1 and 50),
  note text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'declined', 'suggested')),
  suggested_time text,
  created_at timestamptz not null default now()
);

create index on opening_hours (place_slug);
create index on menu_categories (place_slug);
create index on menu_items (category_id);
create index on orders (place_slug, created_at desc);
create index on bookings (place_slug, date);

alter table places enable row level security;
alter table opening_hours enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table bookings enable row level security;
