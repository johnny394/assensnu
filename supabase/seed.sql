-- Lavet af scripts/lav-seed.ts. Kør efter 0001_init.sql.
begin;
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('proevepizza', 'Prøvepizza (demo)', array['Pizza', 'Kebab']::text[], 'Østergade 1, 5610 Assens', '11 22 33 44', null, null, 'Et opdigtet sted til at afprøve AssensNu. Bestillinger her går ingen steder.', true, true, true, true, 20, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
insert into opening_hours (place_slug, day, open, close) values ('proevepizza', 0, '11:00', '23:00');
insert into opening_hours (place_slug, day, open, close) values ('proevepizza', 1, '11:00', '23:00');
insert into opening_hours (place_slug, day, open, close) values ('proevepizza', 2, '11:00', '23:00');
insert into opening_hours (place_slug, day, open, close) values ('proevepizza', 3, '11:00', '23:00');
insert into opening_hours (place_slug, day, open, close) values ('proevepizza', 4, '11:00', '23:00');
insert into opening_hours (place_slug, day, open, close) values ('proevepizza', 5, '11:00', '23:00');
insert into opening_hours (place_slug, day, open, close) values ('proevepizza', 6, '11:00', '23:00');
with c as (insert into menu_categories (place_slug, name, position) values ('proevepizza', 'Pizza', 0) returning id)
insert into menu_items (category_id, name, description, price_kr, position) values
  ((select id from c), 'Margherita', 'Tomat og ost', 75, 0),
  ((select id from c), 'Pepperoni', 'Tomat, ost og pepperoni', 85, 1),
  ((select id from c), 'Kebabpizza', 'Kebab, løg og dressing', 95, 2),
  ((select id from c), 'Hawaii', 'Skinke og ananas', 85, 3);
with c as (insert into menu_categories (place_slug, name, position) values ('proevepizza', 'Kebab og durum', 1) returning id)
insert into menu_items (category_id, name, description, price_kr, position) values
  ((select id from c), 'Durum', 'Kebab, salat og dressing i tyndt brød', 70, 0),
  ((select id from c), 'Kebab i pitabrød', null, 65, 1),
  ((select id from c), 'Kebabtallerken', 'Med pommes frites og salat', 95, 2);
with c as (insert into menu_categories (place_slug, name, position) values ('proevepizza', 'Drikkevarer', 2) returning id)
insert into menu_items (category_id, name, description, price_kr, position) values
  ((select id from c), 'Sodavand 0,5 l', null, 25, 0),
  ((select id from c), 'Kildevand 0,5 l', null, 20, 1);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('assens-trattoria', 'Assens Trattoria', array['Italiensk', 'Pizza']::text[], 'Østergade 19, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('cafe-banken', 'Café Banken', array['Café', 'Nachos', 'Vegetar']::text[], 'Østergade 14-16, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('frederik-ix', 'Frederik IX', array['Kinesisk', 'Steakhouse']::text[], 'Østergade 44, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('restaurant-bryggen', 'Restaurant Bryggen', array['Italiensk']::text[], 'Østergade 8, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('plums-gaards-gourmet', 'Plums Gaards Gourmet', array['Europæisk', 'Tapas']::text[], 'Østergade 38, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('skaenkestuen', 'Skænkestuen Assens', array['Restaurant']::text[], 'Østergade 38, 5610 Assens', null, null, null, null, null, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('pizza-bella', 'Pizza Bella & Kebab House', array['Pizza', 'Kebab']::text[], 'Østergade 62, 5610 Assens', '64 74 20 06', null, null, null, true, null, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('pizza-thats-amore', 'Pizza That''s Amore', array['Pizza']::text[], 'Assens', null, null, null, null, true, null, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('pomodoro', 'Pomodoro Pizza Grill House', array['Pizza', 'Grill']::text[], 'Damgade 7, 5610 Assens', null, null, null, null, true, null, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('la-posta', 'Restaurant La Posta', array['Italiensk', 'Pizza']::text[], 'Søndre Ringvej 2, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('grillhjoernet', 'Grillhjørnet', array['Grill', 'Burger']::text[], 'Nørre Allé 12, 5610 Assens', null, null, null, null, true, null, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('havnegrillen', 'Havnegrillen', array['Grill', 'Burger', 'Dansk']::text[], 'Nordre Havnevej 14, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('strandporten', 'Strandporten, Local Food', array['Dansk']::text[], 'Willemoesgade 6, 5610 Assens', null, null, null, null, true, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('thai-food-assens', 'Thai Food Assens', array['Thai']::text[], 'Assens', null, null, null, null, null, null, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('saigon-dragon', 'Saigon Dragon', array['Vietnamesisk']::text[], 'Assens', null, null, null, null, null, null, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('ella-sushi', 'Ella Sushi', array['Sushi']::text[], 'Assens', null, null, null, null, null, null, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('oneills', 'O''Neill''s', array['Pub']::text[], 'Assens', null, null, null, null, false, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('cafe-emilo', 'Café Emilo (Hotel Assens)', array['Café', 'Restaurant']::text[], 'Assens', null, null, null, null, null, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('willemoes-bryghus', 'Willemoes Bryghus', array['Bryghus', 'Café']::text[], 'Assens', null, null, null, null, false, true, false, false, 20, null);
insert into places (slug, name, cuisines, address, phone, website, facebook, description, takeaway, dine_in, accepts_orders, accepts_bookings, prep_minutes, panel_pin_hash) values ('restaurant-maagen', 'Restaurant Maagen', array['Dansk', 'Catering']::text[], 'Assens', null, null, null, null, null, true, false, false, 20, null);
commit;
