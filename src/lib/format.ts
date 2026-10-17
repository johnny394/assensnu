export const kr = (amount: number) => `${amount.toLocaleString("da-DK")}\u00a0kr.`;

export const telLink = (phone: string) => `tel:+45${phone.replace(/\D/g, "")}`;

const DAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];

// "2026-10-24" -> "lørdag den 24. oktober"
export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[weekday]} den ${d}. ${MONTHS[m - 1]}`;
}
