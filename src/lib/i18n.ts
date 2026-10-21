import { PAGES } from "./i18n-pages";
import type { Place } from "./types";

// Stedets side på engelsk og tysk, til turister. Knapper og overskrifter er oversat her i hånden.
// Menukortet oversættes af sig selv (se translate.ts) og kommer med som `texts`.
// Kassen og køkkenet er stadig på dansk, så restauranten altid ser de danske navne.

export type Lang = "da" | "en" | "de";
export const LANGS: { lang: Lang; name: string }[] = [
  { lang: "da", name: "Dansk" },
  { lang: "en", name: "English" },
  { lang: "de", name: "Deutsch" },
];

export function parseLang(value: unknown): Lang | null {
  return value === "da" || value === "en" || value === "de" ? value : null;
}

// Telefonens sprog, fx "de-DE,de;q=0.9,en;q=0.8". Står dansk der et sted, bliver siden på dansk.
export function langFromHeader(header: string | null): Lang {
  const tags = (header ?? "").toLowerCase().split(",").map((t) => t.trim().slice(0, 2));
  if (tags.includes("da") || tags.includes("nb") || tags.includes("sv")) return "da";
  const first = parseLang(tags[0]);
  return first ?? "da";
}

type Vars = Record<string, string | number>;
export type T = (da: string, vars?: Vars) => string;

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

// Finder oversættelsen: først menukortet, så knapperne. Mangler den, står der dansk.
export function translator(lang: Lang, texts: Record<string, string> = {}): T {
  return (da, vars) => fill(lang === "da" ? da : (texts[da] ?? (UI[da] ?? PAGES[da])?.[lang] ?? da), vars);
}

export const UI: Record<string, { en: string; de: string }> = {
  // Overskrifter og knapper på stedets side
  "‹ Alle steder": { en: "‹ All places", de: "‹ Alle Lokale" },
  Menukortet: { en: "Menu", de: "Speisekarte" },
  Åbningstider: { en: "Opening hours", de: "Öffnungszeiten" },
  "Find vej": { en: "Find us", de: "So finden Sie uns" },
  "Mød kokken": { en: "Meet the chef", de: "Die Menschen in der Küche" },
  Ring: { en: "Call", de: "Anrufen" },
  "Book bord": { en: "Book", de: "Buchen" },
  Kort: { en: "Map", de: "Karte" },
  "Intet nummer endnu": { en: "No number yet", de: "Noch keine Nummer" },
  "Ring og book": { en: "Call to book", de: "Anrufen & buchen" },
  "Kun takeaway": { en: "Takeaway only", de: "Nur zum Mitnehmen" },
  "Telefon {phone}": { en: "Phone {phone}", de: "Telefon {phone}" },
  "Stedets egen hjemmeside": { en: "Their own website", de: "Eigene Webseite" },
  "Stedet på Facebook": { en: "On Facebook", de: "Auf Facebook" },
  "Menuen er ikke lagt ind endnu.": { en: "The menu has not been added yet.", de: "Die Speisekarte fehlt noch." },
  " Ring og hør, hvad de har i dag.": { en: " Call and ask what they have today.", de: " Rufen Sie an und fragen Sie, was es heute gibt." },
  "Bestilling her kommer snart. Indtil da kan du ringe.": { en: "Online ordering is coming soon. Until then, please call.", de: "Online-Bestellung kommt bald. Bis dahin bitte anrufen." },
  "Vi mangler stadig åbningstiderne.": { en: "We don't have the opening hours yet.", de: "Die Öffnungszeiten fehlen noch." },
  Lukket: { en: "Closed", de: "Geschlossen" },
  "Menuen er oversat automatisk. Navnet på dansk står under, så du kan sige det til restauranten.": {
    en: "The menu has been translated automatically. The Danish name is shown below, so you can say it to the restaurant.",
    de: "Die Speisekarte wurde automatisch übersetzt. Der dänische Name steht darunter, damit Sie ihn im Restaurant sagen können.",
  },
  "Menuen bliver oversat lige nu. Om lidt står den på engelsk.": {
    en: "The menu is being translated right now. It will be in English in a moment.",
    de: "Die Speisekarte wird gerade übersetzt. Gleich steht sie auf Deutsch da.",
  },
  "Menuen kan ikke oversættes lige nu, så den står på dansk.": {
    en: "The menu can't be translated right now, so it is shown in Danish.",
    de: "Die Speisekarte kann gerade nicht übersetzt werden und steht deshalb auf Dänisch.",
  },
  "Bestilling og betaling foregår på dansk. Spørg gerne restauranten, hvis du er i tvivl.": {
    en: "Ordering and paying is in Danish. Feel free to ask the restaurant if you are unsure.",
    de: "Bestellung und Bezahlung sind auf Dänisch. Fragen Sie gern im Restaurant nach.",
  },

  // Forsiden
  "Hvem har åbent?": { en: "Who's open?", de: "Wer hat geöffnet?" },
  "Hvem har åbent i dag?": { en: "Who's open today?", de: "Wer hat heute geöffnet?" },
  "Hvem har åbent i aften?": { en: "Who's open tonight?", de: "Wer hat heute Abend geöffnet?" },
  "Ingen har åbent lige nu.": { en: "Nobody is open right now.", de: "Gerade hat niemand geöffnet." },
  "Ét sted har åbent lige nu.": { en: "One place is open right now.", de: "Ein Lokal hat gerade geöffnet." },
  "{n} steder har åbent lige nu.": { en: "{n} places are open right now.", de: "{n} Lokale haben gerade geöffnet." },
  Søg: { en: "Search", de: "Suchen" },
  "Søg, fx pizza eller durum": { en: "Search, e.g. pizza or kebab", de: "Suchen, z. B. Pizza oder Döner" },
  "Åben nu": { en: "Open now", de: "Jetzt geöffnet" },
  Takeaway: { en: "Takeaway", de: "Zum Mitnehmen" },
  "Spis på stedet": { en: "Eat in", de: "Vor Ort essen" },
  "Bestil her": { en: "Order here", de: "Hier bestellen" },
  "Halv pris på 1 ret til kl. {tid}": { en: "Half price on 1 dish until {tid}", de: "Halber Preis auf 1 Gericht bis {tid} Uhr" },
  "Halv pris på {n} retter til kl. {tid}": { en: "Half price on {n} dishes until {tid}", de: "Halber Preis auf {n} Gerichte bis {tid} Uhr" },
  "Kommer snart": { en: "Coming soon", de: "Bald dabei" },
  "Ingen steder passer.": { en: "No places match.", de: "Keine Lokale gefunden." },
  "Vis alle": { en: "Show all", de: "Alle zeigen" },
  "Fandt du ikke det, du havde lyst til?": { en: "Didn't find what you fancy?", de: "Nicht das Richtige gefunden?" },
  "Der er flere spisesteder i {by}.": { en: "There are more places to eat in {by}.", de: "In {by} gibt es noch mehr Lokale." },
  "Se spisestederne i {by} ›": { en: "See the places in {by} ›", de: "Lokale in {by} ansehen ›" },
  "Travlt, ": { en: "Busy, ", de: "Viel los, " },
  "Dagens tilbud": { en: "Today's offers", de: "Angebote des Tages" },
  "Se alle {n} ›": { en: "See all {n} ›", de: "Alle {n} ansehen ›" },
  "Stederne med tilbud i dag har ikke åbent lige nu.": { en: "The places with offers today are not open right now.", de: "Die Lokale mit Angeboten haben gerade geschlossen." },
  "Kl. {tid}": { en: "{tid}", de: "{tid} Uhr" },
  Mad: { en: "Food", de: "Essen" },
  Favoritter: { en: "Favourites", de: "Favoriten" },

  // Ugedage
  Mandag: { en: "Monday", de: "Montag" },
  Tirsdag: { en: "Tuesday", de: "Dienstag" },
  Onsdag: { en: "Wednesday", de: "Mittwoch" },
  Torsdag: { en: "Thursday", de: "Donnerstag" },
  Fredag: { en: "Friday", de: "Freitag" },
  Lørdag: { en: "Saturday", de: "Samstag" },
  Søndag: { en: "Sunday", de: "Sonntag" },

  // Åben eller lukket
  ÅBEN: { en: "OPEN", de: "OFFEN" },
  LUKKET: { en: "CLOSED", de: "GESCHLOSSEN" },
  "Åbningstider mangler": { en: "Opening hours missing", de: "Öffnungszeiten fehlen" },
  "Åben til {tid}": { en: "Open until {tid}", de: "Geöffnet bis {tid}" },
  "Åben til {tid} i dag": { en: "Open until {tid} today", de: "Heute geöffnet bis {tid}" },
  "Lukket, åbner kl. {tid}": { en: "Closed, opens at {tid}", de: "Geschlossen, öffnet um {tid}" },
  "Lukket, åbner i morgen kl. {tid}": { en: "Closed, opens tomorrow at {tid}", de: "Geschlossen, öffnet morgen um {tid}" },
  "Lukket, åbner {dag} kl. {tid}": { en: "Closed, opens {dag} at {tid}", de: "Geschlossen, öffnet {dag} um {tid}" },
  "Takeaway er klar om": { en: "Takeaway ready in", de: "Zum Mitnehmen fertig in" },
  "ca. {min} min": { en: "about {min} min", de: "ca. {min} Min." },
  "Travlt lige nu": { en: "Busy right now", de: "Gerade viel los" },
  "Bestil allerede nu til senere i dag. Maden kan være klar fra": { en: "Order now for later today. Food can be ready from", de: "Jetzt für später bestellen. Das Essen kann fertig sein ab" },
  "kl. {tid}": { en: "{tid}", de: "{tid} Uhr" },

  // Menukortet
  "Udsolgt i dag": { en: "Sold out today", de: "Heute ausverkauft" },
  "fra ": { en: "from ", de: "ab " },
  "{n} i kurven": { en: "{n} in basket", de: "{n} im Korb" },
  "Vælg {navn}": { en: "Choose {navn}", de: "{navn} wählen" },
  "Læg {navn} i kurven": { en: "Add {navn} to basket", de: "{navn} in den Korb" },
  "Fjern en {navn}": { en: "Remove one {navn}", de: "Ein {navn} entfernen" },
  "Læg en {navn} mere i kurven": { en: "Add one more {navn}", de: "Noch ein {navn}" },
  "{n} vare": { en: "{n} item", de: "{n} Artikel" },
  "{n} varer": { en: "{n} items", de: "{n} Artikel" },
  "Se kurven ›": { en: "See basket ›", de: "Zum Korb ›" },
  Størrelse: { en: "Size", de: "Größe" },
  "Ekstra på": { en: "Extras", de: "Extras" },
  Luk: { en: "Close", de: "Schließen" },
  "Læg i kurven · {pris}": { en: "Add to basket · {pris}", de: "In den Korb · {pris}" },
  " (halv pris)": { en: " (half price)", de: " (halber Preis)" },

  // Dagens tilbud og sidste chance
  Tilbud: { en: "Offer", de: "Angebot" },
  "Dagens tilbud · kl. {tid}": { en: "Today's offer · {tid}", de: "Angebot des Tages · {tid} Uhr" },
  "før {pris}": { en: "was {pris}", de: "vorher {pris}" },
  "Spar {kr} kr.": { en: "Save {kr} kr.", de: "Sparen Sie {kr} kr." },
  "Ja tak! Læg i kurven": { en: "Yes please! Add to basket", de: "Ja, bitte! In den Korb" },
  "✓ {n} i kurven": { en: "✓ {n} in basket", de: "✓ {n} im Korb" },
  "Fjern en": { en: "Remove one", de: "Eins entfernen" },
  "Læg en mere i kurven": { en: "Add one more", de: "Noch eins" },
  "Sidste chance": { en: "Last chance", de: "Letzte Chance" },
  "Halv pris til kl. {tid}": { en: "Half price until {tid}", de: "Halber Preis bis {tid} Uhr" },
  "Det, køkkenet har tilbage i dag. Så bliver det spist i stedet for smidt ud.": {
    en: "What the kitchen has left today. Eaten instead of thrown away.",
    de: "Was die Küche heute übrig hat. Lieber gegessen als weggeworfen.",
  },
  "Vælg ›": { en: "Choose ›", de: "Wählen ›" },
  "Læg i kurven": { en: "Add to basket", de: "In den Korb" },
  "{n} i kurven +": { en: "{n} in basket +", de: "{n} im Korb +" },
};

// Alt det, restauranten selv har skrevet, og som en turist skal kunne læse
export function placeTexts(place: Place): string[] {
  const all = [
    place.description,
    place.news?.text,
    place.chef?.text,
    ...place.cuisines,
    ...place.menu.flatMap((c) => [
      c.name,
      ...(c.options?.sizes.map((s) => s.name) ?? []),
      ...(c.options?.extras.map((e) => e.name) ?? []),
      ...c.items.flatMap((i) => [i.name, i.description]),
    ]),
  ];
  return [...new Set(all.map((s) => s?.trim()).filter((s): s is string => !!s && /\p{L}/u.test(s)))];
}
