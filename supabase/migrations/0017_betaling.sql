-- Online betaling med MobilePay og kort gennem Stripe.
-- Hvert sted får sin egen Stripe-konto. online_pay slås til, når Stripe siger, at kontoen kan tage imod penge.
alter table places add column if not exists stripe_account text;
alter table places add column if not exists online_pay boolean not null default false;
-- Mangler payment, betaler kunden ved afhentning eller døren som før
alter table orders add column if not exists payment jsonb;
