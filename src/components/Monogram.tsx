import type { Place } from "@/lib/types";

// Indtil stederne har egne billeder: et farvet skilt med forbogstavet.
// Farven følger madtypen, så pizzasteder ligner hinanden, cafeer ligner hinanden osv.
const TINTS: [RegExp, string][] = [
  [/pizza|italiensk|kebab|burger|grill/i, "bg-signal-soft text-signal"],
  [/sushi|kinesisk|thai|asiatisk|indisk|vietnam/i, "bg-sea-soft text-sea"],
  [/café|cafe|bager|kage|is\b/i, "bg-buoy-soft text-buoy-deep"],
  [/dansk|restaurant|steak|fisk|bistro|kro/i, "bg-go-soft text-go"],
];

export function Monogram({ place, large }: { place: Pick<Place, "name" | "cuisines">; large?: boolean }) {
  const tint = TINTS.find(([re]) => place.cuisines.some((c) => re.test(c)))?.[1] ?? "bg-paper-deep text-ink";
  const letter = place.name.replace(/^(café|restaurant|cafe)\s+/i, "").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-display font-extrabold tracking-tight ${tint} ${
        large ? "h-[4.5rem] w-[4.5rem] rounded-[1.4rem] text-[2.4rem]" : "h-14 w-14 rounded-[1.05rem] text-[1.7rem]"
      }`}
    >
      {letter}
    </span>
  );
}
