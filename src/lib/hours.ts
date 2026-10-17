import type { OpeningPeriod, Place, Weekday } from "./types";

export const WEEKDAYS = [
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
  "Søndag",
] as const;

// Tidspunkt i Assens uanset hvor serveren eller browseren står
export function copenhagenNow(date = new Date()): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) as Weekday;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export type OpenStatus =
  | { state: "unknown" }
  | { state: "open"; closesAt: string }
  | { state: "closed"; opensAt?: { day: Weekday; time: string } };

export function openStatus(place: Pick<Place, "hours" | "closedToday">, date = new Date()): OpenStatus {
  if (place.hours.length === 0) return { state: "unknown" };
  const now = copenhagenNow(date);

  if (!place.closedToday) {
    for (const p of place.hours) {
      const open = toMinutes(p.open);
      const close = toMinutes(p.close);
      const overnight = close <= open;
      if (p.day === now.day && now.minutes >= open && (overnight || now.minutes < close)) {
        return { state: "open", closesAt: p.close };
      }
      // Åbent fra i går og over midnat
      if (overnight && (p.day + 1) % 7 === now.day && now.minutes < close) {
        return { state: "open", closesAt: p.close };
      }
    }
  }

  return { state: "closed", opensAt: nextOpening(place.hours, now, place.closedToday) };
}

function nextOpening(
  hours: OpeningPeriod[],
  now: { day: Weekday; minutes: number },
  closedToday?: boolean,
): { day: Weekday; time: string } | undefined {
  for (let offset = 0; offset < 8; offset++) {
    const day = ((now.day + offset) % 7) as Weekday;
    if (offset === 0 && closedToday) continue;
    const candidates = hours
      .filter((p) => p.day === day && (offset > 0 || toMinutes(p.open) > now.minutes))
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
    if (candidates.length > 0) return { day, time: candidates[0].open };
  }
  return undefined;
}

export function describeStatus(status: OpenStatus, today: Weekday): string {
  switch (status.state) {
    case "unknown":
      return "Åbningstider mangler";
    case "open":
      return `Åben til ${status.closesAt}`;
    case "closed": {
      if (!status.opensAt) return "Lukket";
      const { day, time } = status.opensAt;
      if (day === today) return `Lukket, åbner kl. ${time}`;
      if (day === (today + 1) % 7) return `Lukket, åbner i morgen kl. ${time}`;
      return `Lukket, åbner ${WEEKDAYS[day].toLowerCase()} kl. ${time}`;
    }
  }
}
