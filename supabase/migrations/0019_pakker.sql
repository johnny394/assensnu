-- Pakkerne Basis, Event og Fuld. Den valgte pakke gemmes i places.subscription, så her kommer kun det nye.
-- Hvor mange beskeder stedet har sendt til følgerne i måneden, fx { "month": "2026-11", "used": 2 }
alter table places add column if not exists push_used jsonb;
-- Events, som et sted selv har lagt ud i sit panel. Tom = lagt ud i admin.
alter table events add column if not exists place_slug text references places on delete cascade on update cascade;
