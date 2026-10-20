-- Levering: restauranten kører selv ud, kunden betaler ved døren.
-- places.delivery er null, når stedet ikke leverer, ellers {"fee": 39, "minimum": 150, "postcodes": ["5610"]}.
-- orders.delivery er null ved afhentning, ellers {"address": "...", "postcode": "5610", "fee": 39}.
alter table places add column if not exists delivery jsonb;
alter table orders add column if not exists delivery jsonb;
