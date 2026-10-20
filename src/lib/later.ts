// "Bestil til senere": kunden vælger fx kl. 18.00 allerede om formiddagen.

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Afhentningstiderne samlet pr. time, så man kan finde kl. 18 uden at scrolle forbi 30 knapper
export function slotsByHour(slots: string[]): { hour: string; slots: string[] }[] {
  const groups: { hour: string; slots: string[] }[] = [];
  for (const slot of slots) {
    const hour = slot.slice(0, 2);
    const last = groups[groups.length - 1];
    if (last?.hour === hour) last.slots.push(slot);
    else groups.push({ hour, slots: [slot] });
  }
  return groups;
}

// Hvornår skal køkkenet gå i gang med en ordre til senere? Null, hvis den skal laves nu.
export function startLater(pickup: string, waitMinutes: number, nowMinutes: number): string | null {
  if (pickup === "asap") return null;
  const start = minutesOf(pickup) - waitMinutes;
  if (start <= nowMinutes) return null;
  return `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
}
