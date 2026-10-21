import { describe, expect, it } from "vitest";
import { chefPhotoUrl, cleanChef, decodePhoto } from "./chef";

const jpeg = "data:image/jpeg;base64,/9j/4AAQ";

describe("Mød kokken", () => {
  it("renser navn og tekst og beholder billedet, hvis intet nyt er sendt", () => {
    expect(cleanChef({ name: "  Ali  og Sara ", text: "Vi har lavet pizza i 20 år.\n\n\n\nVelkommen!" })).toEqual({
      ok: true,
      value: { chef: { name: "Ali og Sara", text: "Vi har lavet pizza i 20 år.\n\nVelkommen!" }, photo: undefined },
    });
  });

  it("kræver både navn og tekst, men tomt fjerner det hele", () => {
    expect(cleanChef({ name: "Ali", text: "" }).ok).toBe(false);
    expect(cleanChef({ name: "", text: "Hej" }).ok).toBe(false);
    expect(cleanChef({ name: "", text: "" })).toEqual({ ok: true, value: { chef: null, photo: null } });
  });

  it("tager kun imod billeder", () => {
    expect(cleanChef({ name: "Ali", text: "Hej", photo: jpeg })).toEqual({ ok: true, value: { chef: { name: "Ali", text: "Hej" }, photo: jpeg } });
    expect(cleanChef({ name: "Ali", text: "Hej", photo: "data:text/html;base64,PGI+" }).ok).toBe(false);
    expect(cleanChef({ name: "Ali", text: "Hej", photo: `data:image/jpeg;base64,${"A".repeat(700_000)}` }).ok).toBe(false);
    expect(cleanChef({ name: "Ali", text: "Hej", photo: null })).toEqual({ ok: true, value: { chef: { name: "Ali", text: "Hej" }, photo: null } });
  });

  it("laver adressen til billedet og læser det igen", () => {
    expect(chefPhotoUrl("proevepizza", { name: "A", text: "B" })).toBeNull();
    expect(chefPhotoUrl("proevepizza", { name: "A", text: "B", photoAt: "2026-10-21T09:00:00.000Z" })).toBe("/sted/proevepizza/kokken?v=1792573200000");
    expect(decodePhoto(jpeg)?.type).toBe("image/jpeg");
    expect(decodePhoto("hej")).toBeNull();
  });
});
