import type { Chef } from "./types";
import type { Result } from "./orders";

// Mød kokken: et billede og tre linjer om folkene bag stedet
export const CHEF_NAME_MAX = 60;
export const CHEF_TEXT_MAX = 300;
// Billedet gøres mindre på telefonen, før det sendes. Det her er et loft, hvis noget går galt.
export const CHEF_PHOTO_MAX = 600_000;

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").slice(0, max) : "");

// photo: undefined = behold billedet, null = fjern det, tekst = nyt billede som data-URL
export function cleanChef(body: unknown): Result<{ chef: Omit<Chef, "photoAt"> | null; photo: string | null | undefined }> {
  const b = (body ?? {}) as { name?: unknown; text?: unknown; photo?: unknown };
  const name = clean(b.name, CHEF_NAME_MAX);
  const text = clean(b.text, CHEF_TEXT_MAX);
  let photo: string | null | undefined;
  if (b.photo === null) photo = null;
  else if (typeof b.photo === "string") {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.photo)) return { ok: false, error: "Billedet kunne ikke læses. Prøv et andet billede." };
    if (b.photo.length > CHEF_PHOTO_MAX) return { ok: false, error: "Billedet er for stort. Prøv et andet billede." };
    photo = b.photo;
  }
  if (!name && !text) return { ok: true, value: { chef: null, photo: photo === undefined ? null : photo } };
  if (!name) return { ok: false, error: "Skriv hvem I er, fx Ali og Sara." };
  if (!text) return { ok: false, error: "Skriv et par linjer om jer." };
  return { ok: true, value: { chef: { name, text }, photo } };
}

// Selve billedet som filer, så det ikke fylder i siden. ?v= skifter, når billedet skiftes.
export const chefPhotoUrl = (slug: string, chef: Chef) => (chef.photoAt ? `/sted/${slug}/kokken?v=${Date.parse(chef.photoAt)}` : null);

export function decodePhoto(dataUrl: string): { type: string; bytes: Buffer } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  return m ? { type: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}
