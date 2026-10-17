-- AssensNu: spisesteder, åbningstider, menuer, takeaway-ordrer og bordbookinger

create table places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  cuisines text[] not null default '{}',
  address text not null,
  phone text,
  website text,
  facebook text,
  description text,
  takeaway boolean,
  dine_in boolean,
  closed_today date, -- sat til dagens dato, når ejeren melder "lukket i dag"
  accepts_orders boolean not null default false,
  accepts_bookings boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- day: 0 = mandag ... 6 = søndag. close <= open betyder åbent over midnat.
create table opening_hours (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  day smallint not null check (day between 0 and 6),
  open time not null,
  close time not null
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  name text not null,
  position int not null default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories on delete cascade,
  name text not null,
  description text,
  price_kr numeric(8, 2) not null,
  available boolean not null default true,
  position int not null default 0
);

-- Ejere og ansatte, der må redigere et spisested og se dets ordrer
create table place_members (
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (place_id, user_id)
);

create type order_status as enum ('new', 'accepted', 'ready', 'picked_up', 'rejected');

create table orders (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  pickup_at timestamptz not null,
  note text,
  status order_status not null default 'new',
  total_kr numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  menu_item_id uuid references menu_items on delete set null,
  name text not null, -- kopi, så ordren holder selv om menuen ændres
  price_kr numeric(8, 2) not null,
  quantity int not null check (quantity > 0)
);

create type booking_status as enum ('requested', 'confirmed', 'declined', 'cancelled');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  starts_at timestamptz not null,
  guests int not null check (guests between 1 and 50),
  note text,
  status booking_status not null default 'requested',
  created_at timestamptz not null default now()
);

create index on opening_hours (place_id);
create index on menu_categories (place_id);
create index on menu_items (category_id);
create index on orders (place_id, created_at desc);
create index on bookings (place_id, starts_at);

create function is_place_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from place_members where place_id = p and user_id = auth.uid());
$$;

alter table places enable row level security;
alter table opening_hours enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table place_members enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table bookings enable row level security;

-- Alle kan læse offentlige oplysninger
create policy "public read" on places for select using (published);
create policy "public read" on opening_hours for select using (true);
create policy "public read" on menu_categories for select using (true);
create policy "public read" on menu_items for select using (true);

-- Ejere redigerer deres eget sted
create policy "members update" on places for update using (is_place_member(id));
create policy "members write" on opening_hours for all using (is_place_member(place_id));
create policy "members write" on menu_categories for all using (is_place_member(place_id));
create policy "members write" on menu_items for all
  using (is_place_member((select place_id from menu_categories c where c.id = category_id)));
create policy "members read own" on place_members for select using (user_id = auth.uid());

-- Ordrer og bookinger oprettes via serveren (service role) og læses/opdateres af ejerne
create policy "members read" on orders for select using (is_place_member(place_id));
create policy "members update" on orders for update using (is_place_member(place_id));
create policy "members read" on order_items for select
  using (is_place_member((select place_id from orders o where o.id = order_id)));
create policy "members read" on bookings for select using (is_place_member(place_id));
create policy "members update" on bookings for update using (is_place_member(place_id));

-- Nye ordrer og bookinger sendes live til restaurantpanelet
alter publication supabase_realtime add table orders, bookings;
