-- Flere byer i samme database. Alt, der findes nu, hører til Assens.
alter table places add column if not exists town text not null default 'Assens';
alter table events add column if not exists town text not null default 'Assens';
create index if not exists places_town on places (town);
