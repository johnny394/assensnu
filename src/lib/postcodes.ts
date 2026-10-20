// Byer omkring Assens, så kunden kan se et navn ved postnummeret
const TOWNS: Record<string, string> = {
  "5492": "Vissenbjerg",
  "5560": "Aarup",
  "5592": "Ejby",
  "5610": "Assens",
  "5620": "Glamsbjerg",
  "5631": "Ebberup",
  "5642": "Millinge",
  "5683": "Haarby",
  "5690": "Tommerup",
};

export const townName = (postcode: string) => (TOWNS[postcode] ? `${postcode} ${TOWNS[postcode]}` : postcode);
