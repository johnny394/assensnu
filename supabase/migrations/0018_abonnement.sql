-- Restaurantens abonnement hos ByNu, betalt med kort og trukket automatisk hver måned gennem Stripe.
-- { customer: "cus_...", status: "active" | "past_due" | "canceled" | ... }
alter table places add column if not exists subscription jsonb;
