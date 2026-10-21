export const kr = (amount: number) => `${amount.toLocaleString("da-DK")}\u00a0kr.`;

export const telLink = (phone: string) => (phone.startsWith("+") ? `tel:${phone}` : `tel:+45${phone.replace(/\D/g, "")}`);

const DAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];

// "2026-10-24" -> "lørdag den 24. oktober". På engelsk og tysk: "Saturday 24 October" / "Samstag, 24. Oktober".
export function longDate(iso: string, lang: "da" | "en" | "de" = "da") {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (lang !== "da") return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "de-DE", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(date);
  return `${DAYS[date.getUTCDay()]} den ${d}. ${MONTHS[m - 1]}`;
}
