import "server-only";
import { store } from "./store";

// Navn, telefon og adresse gemmes kun så længe, det giver mening. Står også i privatlivspolitikken.
export const KEEP_DAYS = 90;
// Så mange bestillinger kan ét telefonnummer sende på en time, så ingen kan drille med falske ordrer
export const MAX_ORDERS_PER_HOUR = 4;

let lastRun = 0;

// Køres i baggrunden, når panelet henter ordrer. Højst én gang i timen pr. server.
export async function forgetOldCustomers() {
  if (Date.now() - lastRun < 3600_000) return;
  lastRun = Date.now();
  try {
    await store.forgetCustomers(new Date(Date.now() - KEEP_DAYS * 24 * 3600_000).toISOString());
  } catch (e) {
    console.error("Kunne ikke slette gamle kundedata", e);
  }
}

export async function tooManyOrders(phone: string) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  return (await store.countOrdersByPhone(phone, since).catch(() => 0)) >= MAX_ORDERS_PER_HOUR;
}
