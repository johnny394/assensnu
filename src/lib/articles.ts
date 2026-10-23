// Artiklerne på bynu.dk. Rettes her, så ændres siden.
export const CONTACT = { email: "info@bynu.dk", phone: "93 91 80 45", tel: "+4593918045" };

export type Block = { p: string } | { list: { title: string; text: string }[] } | { tip: string } | { contact: true };

export type Article = { slug: string; kicker: string; title: string; lead: string; body: Block[] };

export const ARTICLES: Article[] = [
  {
    slug: "om",
    kicker: "Om ByNu",
    title: "Byens mad, samlet ét sted",
    lead: "Hvem har åbent i aften? Hvad koster en familiepizza? Kan vi få et bord kl. 19? ByNu giver svaret ét sted, by for by.",
    body: [
      { p: "ByNu startede i Assens med en enkel idé: Det skal være let at finde ud af, hvor man kan spise i sin egen by. Man skal ikke lede på ti forskellige hjemmesider eller ringe rundt." },
      { p: "Hver by har sin egen side, fx AssensNu og GlamsbjergNu. Her står alle byens spisesteder med åbningstider, menukort og telefonnummer. Hos de steder, der er med, kan du bestille takeaway og bede om et bord direkte på siden." },
      { p: "ByNu er lavet lokalt på Fyn. Pengene for maden går til spisestedet, så de bliver i byen." },
    ],
  },
  {
    slug: "til-gaester",
    kicker: "Til gæster",
    title: "Sulten? Sådan gør du",
    lead: "Ingen app, ingen profil og ingen kode. Du åbner siden, vælger og bestiller.",
    body: [
      {
        list: [
          { title: "Se hvem der har åbent", text: "Listen viser med det samme, hvem der har åbent lige nu, og hvornår de lukker." },
          { title: "Bestil takeaway", text: "Læg maden i kurven, skriv navn og telefonnummer, og vælg hvornår du vil hente den. Du kan ofte betale med MobilePay eller kort med det samme, ellers betaler du, når du henter. Mange steder kan også bringe maden ud." },
          { title: "Book bord", text: "Vælg dag, tid og hvor mange I er, så svarer restauranten dig." },
          { title: "Få besked", text: "Sig ja til beskeder, så får du besked på telefonen, når maden er klar." },
          { title: "Dagens tilbud", text: "Se dagens tilbud fra byens steder, og følg dine favoritter." },
          { title: "Bestil sammen", text: "Del et link med familien eller kollegerne, så kan alle lægge deres egen mad i én fælles bestilling." },
        ],
      },
      { p: "Siden findes også på engelsk og tysk, så turister og gæster i havnen og på campingpladsen kan være med." },
      { tip: "Læg siden på din hjemmeskærm, så ligger den der som en app." },
    ],
  },
  {
    slug: "til-spisesteder",
    kicker: "Til spisesteder",
    title: "Få bestillinger direkte til dit spisested",
    lead: "ByNu giver dit spisested sin egen side, et enkelt panel til bestillinger og en plads på byens fælles madliste.",
    body: [
      {
        list: [
          { title: "Bestillinger direkte til dig", text: "Bestillingen dukker op på din tablet eller telefon med lyd. Du trykker Accepter og skriver, hvornår maden er klar. Kunden betaler online med MobilePay eller kort, eller hos dig." },
          { title: "Du bestemmer selv", text: "Du skriver selv menukort, priser, åbningstider og lukkedage. Er der travlt, skruer du op for ventetiden med ét tryk." },
          { title: "Bordbestilling", text: "Gæsterne beder om et bord, og du siger ja eller nej." },
          { title: "Nå dine faste gæster", text: "Læg dagens tilbud ud, så får de gæster, der følger dig, en besked på telefonen." },
          { title: "Levering, havn og camping", text: "Bringer du selv ud, sætter du dine egne postnumre og dit eget gebyr. Du kan også levere til bådene i havnen og til gæsterne på campingpladsen." },
          { title: "Se dine tal", text: "Se hvor mange bestillinger du har haft, hvad du har solgt, og hvad gæsterne køber mest." },
          { title: "Ingen binding", text: "Du kan stoppe, når du vil. Der er ingen opsigelsesperiode." },
        ],
      },
      { contact: true },
    ],
  },
];

export const article = (slug: string) => ARTICLES.find((a) => a.slug === slug);
