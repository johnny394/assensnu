import { describe, expect, it } from "vitest";
import { describeStatus } from "./hours";
import { langFromHeader, parseLang, placeTexts, translator } from "./i18n";
import type { Place } from "./types";

describe("sprog", () => {
  it("vælger telefonens sprog, men dansk hvis dansk står der", () => {
    expect(langFromHeader("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(langFromHeader("en-GB,en;q=0.9")).toBe("en");
    expect(langFromHeader("en-US,da;q=0.8")).toBe("da");
    expect(langFromHeader("fr-FR")).toBe("da");
    expect(langFromHeader(null)).toBe("da");
    expect(parseLang("xx")).toBeNull();
  });

  it("oversætter knapper, menutekster og tider, og falder tilbage til dansk", () => {
    const t = translator("en", { "Stegt flæsk": "Crispy pork belly" });
    expect(t("Stegt flæsk")).toBe("Crispy pork belly");
    expect(t("Menukortet")).toBe("Menu");
    expect(t("ca. {min} min", { min: 20 })).toBe("about 20 min");
    expect(t("Noget helt nyt")).toBe("Noget helt nyt");
    expect(translator("da", { Menukortet: "Menu" })("Menukortet")).toBe("Menukortet");
  });

  it("skriver åbent og lukket på tysk med stort på ugedagen", () => {
    const de = translator("de");
    expect(describeStatus({ state: "open", closesAt: "21:00" }, 2, de)).toBe("Geöffnet bis 21:00");
    expect(describeStatus({ state: "closed", opensAt: { day: 5, time: "12:00" } }, 2, de)).toBe("Geschlossen, öffnet Samstag um 12:00");
    expect(describeStatus({ state: "closed", opensAt: { day: 5, time: "12:00" } }, 2)).toBe("Lukket, åbner lørdag kl. 12:00");
  });

  it("samler stedets egne tekster én gang hver", () => {
    const place = {
      description: "Hyggelig pizzeria",
      cuisines: ["Pizza"],
      menu: [
        {
          name: "Pizzaer",
          options: { sizes: [{ name: "Alm.", extra: 0 }, { name: "Familie", extra: 60 }], extras: [{ name: "Ekstra ost", price: 10 }] },
          items: [
            { id: "1", name: "Margherita", description: "Tomat og ost", price: 80 },
            { id: "2", name: "Pepperoni", description: "Tomat og ost", price: 90 },
            { id: "3", name: "12", price: 90 },
          ],
        },
      ],
    } as unknown as Place;
    expect(placeTexts(place)).toEqual(["Hyggelig pizzeria", "Pizza", "Pizzaer", "Alm.", "Familie", "Ekstra ost", "Margherita", "Tomat og ost", "Pepperoni"]);
  });
});
