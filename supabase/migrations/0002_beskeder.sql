-- Gemmer kundens telefon til beskeder, når restauranten svarer. Sletter ingenting.
alter table orders add column if not exists push jsonb;
alter table bookings add column if not exists push jsonb;
